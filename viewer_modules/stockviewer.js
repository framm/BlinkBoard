"use strict";

var request = require('request');
var _ = require('lodash');
var fs = require('fs');

// Visible object
module.exports = {
	getData: function(req, res) {
		request({
			url: 'http://dev.markitondemand.com/MODApis/Api/v2/Quote/json?symbol=' + req.body.symbol,
			method: 'POST'
		}, function(error, response, body) {
			if (error) {
				console.log(error);
			} else {
				var data = JSON.parse(body); // Parse data

				var stockData = {}; // Construct object for changed info

				// Iterate data's properties
				_.forIn(data, function(value, property) {
					if (property === 'LastPrice') { // Set 2 decimals
						value = parseFloat(value).toFixed(2);
					}

					if (property === 'ChangePercent') { // Set 2 decimals
						value = parseFloat(value).toFixed(2);
					}

					stockData[property] = { "value": value };
				});

				res.send(stockData);

				console.log(Date.now(), 'got stock data');
			}
		});
	}
}
