// using: regex, capture groups, and capture group variables.
var loaderUtils = require('loader-utils');
var fs = require('fs');
var path = require('path');

var templateUrlRegex = /templateUrl:(.*)$/gm;
var stylesRegex = /styleUrls:(\s*\[[^\]]*?\])/g;
var stringRegex = /(['"])((?:[^\\]\\\1|.)*?)\1/g;
var templateMapRegex = /export const (.*?): string = (.*)$/gm;
var templateMap = {};

function loadTemplateFile(pathFile) {
    var content = fs.readFileSync(path.normalize(pathFile), 'utf8');
    return content;
};

function mapTemplateUrl(pathFile) {
  var content = loadTemplateFile(pathFile);
  var reg = new RegExp(templateMapRegex);
  var result;
  while(result = reg.exec(content)) {
      templateMap[result[1]] = result[2];
  }
}

function getTemplateUrlFromFile(pathFile, url) {
  if (!Object.keys(templateMap).length){
    mapTemplateUrl(pathFile, url)
  }
  var key = url.replace(/\s?template_url_\d\.(.*),$/g, '$1')
  return templateMap[key];
}

function replaceStringsWithRequires(string, pathFile) {
  if (pathFile && string.indexOf('template_url') > -1){
    url = getTemplateUrlFromFile(pathFile, string);
    return " require(" + url + "),";
  }

  return string.replace(stringRegex, function (match, quote, url) {
    if (url.charAt(0) !== ".") {
      url = "./" + url;
    }
    return "require('" + url + "')";
  });
}

module.exports = function(source, sourcemap) {
    var self = this;
    // Not cacheable during unit tests;
    this.cacheable && this.cacheable();

    // parse query params
    var query = loaderUtils.parseQuery(self.query);
    var newSource = source.replace(templateUrlRegex, function (match, url) {

    // replace: templateUrl: './path/to/template.html'
    // with: template: require('./path/to/template.html')
    return "template:" + replaceStringsWithRequires(url, query.file);
  })
  .replace(stylesRegex, function (match, urls) {
    // replace: stylesUrl: ['./foo.css', "./baz.css", "./index.component.css"]
    // with: styles: [require('./foo.css'), require("./baz.css"), require("./index.component.css")]
    return "styles:" + replaceStringsWithRequires(urls);
  });

  // Support for tests
  if (this.callback) {
    this.callback(null, newSource, sourcemap)
  } else {
    return newSource;
  }
};
