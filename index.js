const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const { json2csv } = require('json-2-csv');

const articles = [];
const crawled = [];
const urlsQueue = ['http://kenh14.vn/nhat-ki-lan-dau-lam-bo-me-cua-cap-vo-chong-u60-o-ha-noi-tho-a-con-la-mon-qua-vo-gia-20190805223654937.chn']; // queue to crawl
const MAX_ARTICLES = 100;

// kenh14's details
const HOST = 'http://kenh14.vn';
const TITLE_IDENTIFIER = '.kbwc-title';
const AUTHOR_IDENTIFIER = '.kbwcm-author';
const DATE_IDENTIFIER = '.kbwcm-time';
const RELATED_ARTICLE_IDENTIFIER = '.krw-list';

//timing
let startTime = null;
let endTime = null;

exportCSV = () => {
    endTime = new Date();
    console.log('urls crawled: ', crawled)
    console.log('articles queue: ', urlsQueue)
    console.log('Execution time: ', (endTime - startTime)/1000)
    json2csv(articles, (err, csv) => {
        if (err) {
            console.error('problem generating csv from json');
            return;
        }
        fs.writeFileSync(__dirname + '/res.csv', csv);
    })
};

const fetchUrl = async (url) => {
    let res, body = null;
    try {
        res = await fetch(url);
        body = await res.text();
    } catch (e) {
        console.error(e);
        return;
    }
    return body;
}

async function crawlUrl() {
    if (!startTime) startTime = new Date();

    const url = urlsQueue.pop();
    crawled.push(url);
    const body = await fetchUrl(url)
    if (!body) {
        console.error('Problem getting html from article');
        return;
    }

    // parsing html from url
    const $ = cheerio.load(body, {normalizeWhitespace: true});
    const $body = $('body');
    const title = $body.find(TITLE_IDENTIFIER).text();
    const author = $body.find(AUTHOR_IDENTIFIER).text();
    const date = $body.find(DATE_IDENTIFIER).text();
    const relatedArticlesDiv = $body.find(RELATED_ARTICLE_IDENTIFIER);
    const relatedUrls = relatedArticlesDiv.find('a').map((i, node) => $(node).attr('href'));

    articles.push({url, title, author, date});
    relatedUrls.toArray().forEach((relatedUrl) => {
        if (crawled.indexOf(HOST + relatedUrl) > -1) return; // don't crawl duplicates
        urlsQueue.push(HOST + relatedUrl);
    });

    // stop crawling after reaching desired number of articles
    // or reaching the end, no more articles to fetch
    if (crawled.length >= MAX_ARTICLES || !urlsQueue.length) {
        exportCSV();
        return;
    }
    // recursively fetch related urls
    crawlUrl();
}

crawlUrl();