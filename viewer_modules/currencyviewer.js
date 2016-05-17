"use strict";

var request = require('request');
var _ = require('lodash');
var fs = require('fs');
var schedule = require('node-schedule');


// Get data
var currencyData = {};

function getCurrencyData() {
	request({
		url: 'https://finance.yahoo.com/webservice/v1/symbols/allcurrencies/quote?format=json',
		method: 'GET'
	}, function(error, response, body) {
		if (error) {
			console.log(error);
		} else {
			// Parse data
			var tempDataObject = JSON.parse(body);

			// Strip useless data
			tempDataObject = tempDataObject.list.resources;

			// Convert from array to object
			for (var i = tempDataObject.length - 1; i >= 0; i--) {
				// Check if response is defined (it randomly isn't, damn Yahoo)
				if ((tempDataObject[i].resource.fields.name === undefined) || (tempDataObject[i].resource.fields.price === undefined) || (tempDataObject[i].resource.fields.ts === undefined)) {
					console.log(tempDataObject[i].resource.fields);
					continue;
				};

				var currency = tempDataObject[i].resource.fields.name.replace('USD/', '');

				// Only include paper/coin currencies
				if (currency.match(/^[A-Z]{3}$/g)) {
					currencyData[currency] = {
						rate: tempDataObject[i].resource.fields.price,
						timestamp: tempDataObject[i].resource.fields.ts
					};
				}
			}
		}
	});
}


// Initial run
getCurrencyData();

// Refresh currency data periodically
var rule = new schedule.RecurrenceRule();
rule.second = [1, 21, 41];

var j = schedule.scheduleJob(rule, function() {
	getCurrencyData();
});


// Visible object
module.exports = {
	getData: function(req, res) {
		// Wait for data to arrive
		if (currencyData === {}) {
			return;
		};

		// Format currency-symbols to fit the flags on the client
		function formatToFlag(string) {
			string = string.substring(0, string.length - 1);
			string = string.toLowerCase();

			return string;
		}

		// Construct return object
		var object = {
			from: req.body.from,
			fromflag: formatToFlag(req.body.from),
			to: req.body.to,
			toflag: formatToFlag(req.body.to)
		};

		// Conversions
		if (req.body.from === 'USD') { // If from is USD
			object.rate = currencyData[req.body.to].rate;
		} else if (req.body.to === 'USD') { // If to is USD
			object.rate = (1 / currencyData[req.body.from].rate);
		} else {
			object.rate = (currencyData[req.body.from].rate / currencyData[req.body.to].rate);
		}


		// Limit decimals
		object.rate = parseFloat(object.rate).toFixed(4);

		// Iterate data's properties to add room for 'changed' variables
		_.forIn(object, function(value, property) {
			object[property] = { "value": value };
		});

		res.send(object);

		console.log(Date.now(), 'updated currency data');
	}
}
