'use strict';
var ESIndexer = require('./es.js');
var async = require("async");

var esIndexer = new ESIndexer();

var indexingQueue = async.queue(esIndexer.indexItem, 1); // Run two simultaneous uploads
indexingQueue.drain = function() {
    console.log("All done Indexing item");
};

function TxController() {
}

var transformed = null;

TxController.prototype.list = function (item, callback) {
  
  var node = item.node;
  console.log("Récupération txs block  : " + item.height);
  console.log("node :  " + node);
  node.services.bitcoind.getBlockHeader(parseInt(item.height), function (err, info) {
    if (err) {
      console.log(err);
      return;
    }
    var blockHash = info.hash;
    console.log("blockHash : " + blockHash);
    node.services.bitcoind.getBlockOverview(blockHash, function (err, block) {
      if (err) {
        console.log(err);
        return;
      }
      var txids = block.txids;
      var totalTxs = txids.length;
      var queue = async.queue(getDetailedTransaction, 1); // Run one simultaneous uploads
      queue.drain = function() {
          console.log("All done getDetailedTransaction");
      };
      for (var i =0; i < totalTxs; i++){
          var txid = txids[i];
          // Queue the block heigth for processing
          console.log("Pushing txid " + txid);
          queue.push({"txid": txid, "node": node});
      }
    });
  });

  // start polling at an interval until the data is found at the global
  var intvl = setInterval(function() {
    if (transformed) { 
        transformed = null;
        clearInterval(intvl);
        console.log("calling queue callback  ");
        callback();
    }
  }, 10);
}

function getDetailedTransaction(item, callback) {
  var node = item.node;
  console.log("getDetailedTransaction item :  " + item.txid + " " + node);
  node.services.bitcoind.getDetailedTransaction(item.txid, function (err, transaction) {
    if (err) {
      console.log(err);
      return;
    }
    transformed = transformTransaction(transaction, node);
    var cloned = transformed;

    // Queue the block heigth for processing
    console.log("Pushing item to Index : " + cloned);
    indexingQueue.push(cloned);
    callback();
  });
}

function transformTransaction (transaction, node) {
  var confirmations = 0;
  if (transaction.height >= 0) {
    confirmations = node.services.bitcoind.height - transaction.height + 1;
  }

  var transformed = {
    txid: transaction.hash,
    version: transaction.version,
    locktime: transaction.locktime
  };

  if (transaction.coinbase) {
    transformed.vin = [
      {
        coinbase: transaction.inputs[0].script,
        sequence: transaction.inputs[0].sequence,
        n: 0
      }
    ];
  } else {
    transformed.vin = transaction.inputs.map(transformInput.bind(this));
  }

  transformed.vout = transaction.outputs.map(transformOutput.bind(this));

  transformed.blockhash = transaction.blockHash;
  transformed.blockheight = transaction.height;
  transformed.confirmations = confirmations;
  // TODO consider mempool txs with receivedTime?
  var time = transaction.blockTimestamp ? transaction.blockTimestamp : Math.round(Date.now() / 1000);
  transformed.time = time;
  if (transformed.confirmations) {
    transformed.blocktime = transformed.time;
  }

  if (transaction.coinbase) {
    transformed.isCoinBase = true;
  }

  transformed.valueOut = transaction.outputSatoshis / 1e8;
  transformed.size = transaction.hex.length / 2; // in bytes
  if (!transaction.coinbase) {
    transformed.valueIn = transaction.inputSatoshis / 1e8;
    transformed.fees = transaction.feeSatoshis / 1e8;
  }

  return transformed;
};

function  transformInput (input, index) {
  // Input scripts are validated and can be assumed to be valid
  var transformed = {
    txid: input.prevTxId,
    vout: input.outputIndex,
    sequence: input.sequence,
    n: index
  };

  transformed.scriptSig = {
    hex: input.script
  };
  transformed.scriptSig.asm = input.scriptAsm;

  transformed.addr = input.address;
  transformed.valueSat = input.satoshis;
  transformed.value = input.satoshis / 1e8;
  transformed.doubleSpentTxID = null; // TODO
  //transformed.isConfirmed = null; // TODO
  //transformed.confirmations = null; // TODO
  //transformed.unconfirmedInput = null; // TODO

  return transformed;
};

function transformOutput (output, index) {
  var transformed = {
    value: (output.satoshis / 1e8).toFixed(8),
    n: index,
    scriptPubKey: {
      hex: output.script
    }
  };

  transformed.scriptPubKey.asm = output.scriptAsm;


  transformed.spentTxId = output.spentTxId || null;
  transformed.spentIndex = output.spentIndex ? null : output.spentIndex;
  transformed.spentHeight = output.spentHeight || null;


  if (output.address) {
    transformed.scriptPubKey.addresses = [output.address];
    //var address = bitcore.Address(output.address); //TODO return type from bitcore-node
    //transformed.scriptPubKey.type = address.type;
  }
  return transformed;
};

module.exports = TxController;