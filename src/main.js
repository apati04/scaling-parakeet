const Apify = require('apify');
const placesCrawler = require('./crawler');
const resultJsonSchema = require('./result_item_schema');
const { log } = Apify.utils;

const debug = true;
// const BASE_URL = process.env.BASE_URL;
Apify.main(async () => {
    const input = await Apify.getInput();

    const { searchString, proxyConfig, maxCrawledPlaces, debug } = input;
    if (debug) log.setLevel(log.LEVELS.DEBUG);
    log.info('Scraping Bing Places for search string:', searchString);
    const startRequests = [];
    startRequests.push({ url: 'https://www.bing.com/maps', userData: { searchString } });

    log.info('Start urls are', startRequests);
    const requestQueue = await Apify.openRequestQueue();
    for (const request of startRequests) {
        await requestQueue.addRequest(request);
    }

    const puppeteerPoolOptions = {
        launchPuppeteerOptions: {
            headless: true,
        },
        maxOpenPagesPerInstance: 1,
    };
    // const proxyUrl = Apify.getApifyProxyUrl({ groups: proxyConfig.apifyProxyGroups, country: proxyConfig.apifyProxyCountry });
    // log.info(`Constructed proxy url: ${proxyUrl}`);
    // puppeteerPoolOptions.launchPuppeteerOptions.proxyUrl = proxyUrl;

    // Create and run crawler
    const crawler = placesCrawler.setUpCrawler({
        puppeteerPoolOptions,
        requestQueue,
        maxCrawledPlaces,
        input,
    });
    await crawler.run();

    log.info('Done!');
});
