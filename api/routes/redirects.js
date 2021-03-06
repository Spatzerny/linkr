var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoInc = require('mongoose-auto-increment');
var http = require('http');
var url = require('url');

var connect = mongoose.connect('mongodb://127.0.0.1:27017/linkr');

autoInc.initialize(connect);

var dbSchema = new Schema({
	link: String, 
	code: Number
})

dbSchema.plugin(autoInc.plugin, {model: 'redirects', field: 'code'});
var redirects = connect.model('redirects', dbSchema);

var siteURL = "http://linkr.xyz/";

exports.findAll = function(req, res){
	redirects.find({}, function(err, items){
		res.json(items);
	});
};

exports.findAmount = function(req, res){

	var number = parseInt(req.params.no);

	redirects
		.find({})
		.sort({'code': -1})
		.limit(number)
		.exec(function(err, items){
			res.json(items);
		});

};

exports.newURL = function(req, res){
	
	/*regexs we will need*/

	var regex = new RegExp(/^https?/);
	var linkr = new RegExp(/linkr.xyz\/r\/*/)

	/*manipulate url if needed*/

	var url = req.url.slice(9); 

	if(!regex.test(url)){
		url = "http://" + url;
	}

	var url = validateURL(url);

	/*valid url?
	no: send error
	yes: log to db and return new data!
	*/

	if(url == "Failed" || linkr.test(url)){
		res.send({error: "Please provide a valid URL"});
	}
	else{
		links = new redirects({link: url});

		links.save(function(err, linkObj){

			if(err){
				console.log("Err saving links! - " + err);
			}
			else{
				console.log("Links saved! - " + linkObj);
				res.send({
					link: linkObj.link, 
					code: linkObj.code, 
					redirectLink: siteURL + 'r/' + linkObj.code
				});
			}

		})
	}

};

exports.home = function(req, res){
	res.redirect(siteURL + '#useapi');
}

exports.new = function(req, res){
	res.send("Please enter a URL after 'new/' to create your short code");
}

exports.URLRedirect = function(req, res){

	var redirectCode = parseInt(req.params.URLid);

	redirects.findOne({'code': redirectCode}, function(err, item){
		if(err){	
			console.log("There was an error: " + err );
		}

		if(!item){
			res.send('Not Found');
		}
		else{
			activeUrl(item.link, function(resp){
				
				console.log('STATUS: ' + resp);
				
				if(resp == "ENOTFOUND" || resp == "ECONNREFUSED" || resp == "ECONNRESET"){
					res.redirect(siteURL + '#oops');
				}
				else{
					res.redirect(item.link);
				}

			});
		}

	});
};

/*

	GENERAL REMOVE FUNCTION - NO USE IT ALWAYS BEING ACTIVE NO NEED FOR IT.

exports.remove = function(req, res){
	redirects
		.findOne({})
		.remove()
		.exec();
}*/

function validateURL(url){
	var regex = new RegExp(/([https|http]:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/);
	if(url.match(regex)){
		return url
	}
	else{
		return "Failed";
	}
}


function activeUrl(Url, callback){

	console.log("REQUESTED URL: " + url.parse(Url).host);
	var thing;
	var options = {
		method: 'HEAD',
		host: url.parse(Url).host,
		port: 80,
		path: url.parse(Url).pathname
	};

	var req = http.request(options, function(r){

		console.log("Log r: " + r.statusCode);

		callback(r.statusCode);

	});

	req.on('error', function(err){
		console.log(err);
		callback(err.code);
	});

	req.end();

}

