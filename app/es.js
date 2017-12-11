'use strict';

var elasticsearch = require('elasticsearch');

var ESIndexer = function () {
}

ESIndexer.prototype.indexItem = function (item, callback) {
    console.log("Indexation item : " + JSON.stringify(item));

    var self = this;
    var esClient = new elasticsearch.Client({
        host: 'elasticsearch:9200',
        log: 'trace'
    });
    
    var indexingDoneLoop1 = false;
    // INDEXATION VOUT
    item.vout.forEach(function (vout) {
        indexingDoneLoop1 = false;
        var toIndex = {
            txid: item.txid,
            type: "vout",
            date: new Date(item.time * 1000),
            blockheight: item.blockheight,
            blockhash: item.blockhash,
            "scriptPubKey-asm": vout.scriptPubKey.asm,
            "scriptPubKey-hex": vout.scriptPubKey.hex,
            "scriptPubKey-type": vout.scriptPubKey.type,
            spentIndex: vout.spentIndex,
            spentHeight: vout.spentHeight,
            valueOut: vout.valueOut,
            spentTxId: vout.spentTxId,
            value: vout.value,
            n: vout.n
        }
        //console.log("Indexing " + JSON.stringify(toIndex));
        esClient.index({
            index: 'bitcoin-vout',
            type: "vout",
            body: toIndex
        }, function (error, response) {
            if (error) {
                console.log("ES error : " + JSON.stringify(error));
            }
            if (response) {
                console.log("ES response : " + JSON.stringify(response));
            }
            indexingDoneLoop1 = true;
        });

         // start polling at an interval until the data is found at the global
         var intvlLoop1 = setInterval(function() {
            if (indexingDoneLoop1 == true) { 
                clearInterval(intvlLoop1);
                console.log("calling next indexing vout if any" );
            }
        }, 5);
    });
    indexingDoneLoop1 = true;

    var indexingDoneLoop2 = false;
    // INDEXATION VIN
    item.vin.forEach(function (vin) {
        indexingDoneLoop2 = false;
        var toIndex = {
            txid: item.txid,
            type: "vin",
            date: new Date(item.time * 1000),
            blockheight: item.blockheight,
            blockhash: item.blockhash,
            sequence: vin.sequence,
            coinbase: vin.coinbase,
            addr: vin.addr,
            value: vin.value,
            valueSat: vin.valueSat,
            n: vin.n,
            vout: vin.vout,
            doubleSpentTxID: vin.doubleSpentTxID
        }
        if (vin.scriptSig) {
            toIndex["scriptSig-asm"] = vin.scriptSig.asm;
            toIndex["scriptSig-hex"] = vin.scriptSig.hex;
        }
        //console.log("Indexing " + JSON.stringify(toIndex));
        esClient.index({
            index: 'bitcoin-vin',
            type: "vin",
            body: toIndex
        }, function (error, response) {
            if (error) {
                console.log("ES error : " + JSON.stringify(error));
            }
            if (response) {
                console.log("ES response : " + JSON.stringify(response));
            }
            indexingDoneLoop2 = true;
        });

        // start polling at an interval until the data is found at the global
        var intvlLoop2 = setInterval(function() {
            if (indexingDoneLoop2 == true) { 
                clearInterval(intvlLoop2);
                console.log("calling next index vin if any" );
            }
        }, 5);
    });
    indexingDoneLoop2 = true;

    var indexingDoneLoop3 = false;
    // INDEXATION VOUT ADDRESSES
    item.vout.forEach(function (vout) {
        vout.scriptPubKey.addresses.forEach(function (address) {
            console.log("Indexing vout address" + JSON.stringify(address));
            indexingDoneLoop3 = false;
            var toIndex = {
                txid: item.txid,
                type: "vout-address",
                date: new Date(item.time * 1000),
                address: address,
                blockheight: item.blockheight,
                blockhash: item.blockhash
            }
            console.log("Indexing " + JSON.stringify(toIndex));
            esClient.index({
                index: 'bitcoin-vout-address',
                type: "vout-address",
                body: toIndex
            }, function (error, response) {
                if (error) {
                    console.log("ES error : " + JSON.stringify(error));
                }
                if (response) {
                    console.log("ES response : " + JSON.stringify(response));
                }
                indexingDoneLoop3 = true;
            });

            // start polling at an interval until the data is found at the global
            var intvlLoop3 = setInterval(function() {
                if (indexingDoneLoop3 == true) { 
                    clearInterval(intvlLoop3);
                    console.log("calling next index vout addresses if any" );
                }
            }, 5);
        });
    });
    indexingDoneLoop3 = true;

    var indexingDone = false;
    // INDEXATION TX
    var toIndex = {
        txid: item.txid,
        type: "tx",
        date: new Date(item.time * 1000),
        fees: item.fees,
        locktime: item.locktime,
        confirmations: item.confirmations,
        version: item.version,
        blockheight: item.blockheight,
        valueIn: item.valueIn,
        valueOut: item.valueOut,
        blockhash: item.blockhash,
        size: item.size,
        blocktime: item.blocktime,
        isCoinBase: item.isCoinBase,
        valueIn: item.valueIn
    }
    //console.log("Indexing " + JSON.stringify(toIndex));
    esClient.index({
        index: 'bitcoin-tx',
        type: "tx",
        body: toIndex
    }, function (error, response) {
        if (error) {
            console.log("ES error : " + JSON.stringify(error));
        }
        if (response) {
            console.log("ES response : " + JSON.stringify(response));
        }
        indexingDone = true;
    });

    // start polling at an interval until the data is found at the global
    var intvl = setInterval(function() {
        if (indexingDone == true && indexingDoneLoop1 == true && indexingDoneLoop2 == true && indexingDoneLoop3 == true) { 
            clearInterval(intvl);
            console.log("calling queue Indexing callback  " + callback);
            callback();
        }
    }, 5);
}

module.exports = ESIndexer;