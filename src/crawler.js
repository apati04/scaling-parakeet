// const infiniteScroll = require('./infinite_scroll');
const { MAX_PAGE_RETRIES } = require('./consts');
const { extractData } = require('./data_extractor');

// /**
//  * Save screen and HTML content to debug page
//  */
// const saveScreenForDebug = async (reques, page) => {
//     await saveScreenshot
// };

/**
 * Method to set up crawler to get all data and save them to default dataset
 * @param launchPuppeteerOptions
 * @param requestList
 * @return {Apify.PuppeteerCrawler}
 */
const setUpCrawler = ({ puppeteerPoolOptions, requestQueue, input }) => {
    const crawlerOpts = {
        requestQueue,
        maxRequestRetries: MAX_PAGE_RETRIES, // Sometimes page can failed because of blocking proxy IP
        retireInstanceAfterRequestCount: 100,
        handlePageTimeoutSecs: 30 * 60, // long timeout, because of long infinite scroll
        puppeteerPoolOptions,
        maxConcurrency: 50,
	    minConcurrency: 30 
        //maxConcurrency: Apify.isAtHome() ? undefined : 1,
    };
    return new Apify.PuppeteerCrawler({
        ...crawlerOpts,
        handlePageFunction: async ({ request, page, puppeteerPool }) => {
            const { label } = request.userData;
            log.info(`Open ${request.url} with label: ${label}`);

            try {
                log.info(`Extracting data from url ${page.url()}`);
                const extractedData = await extractData(page, request);
                extractedData.brandify = { service: SERVICE_NAME };
                await Apify.pushData(extractedData);
                log.info(`Finished url ${extractedData.url}`);
            } catch(err) {
                // This issue can happen, mostly because proxy IP was blocked
                // Let's refresh IP using browser refresh.
                if (log.getLevel() === log.LEVELS.DEBUG) {
                    await saveHTML(page, `${request.id}.html`);
                    await saveScreenshot(page, `${request.id}.png`);
                }
                await puppeteerPool.retire(page.browser());
                if (request.retryCount < MAX_PAGE_RETRIES && log.getLevel() !== log.LEVELS.DEBUG) {
                    // This fix to not show stack trace in log for retired requests, but we should handle this on SDK
                    err.stack = 'Stack trace was omitted for retires requests. Set up debug mode to see it.';
                }
                throw err;
            }
        },
        handleFailedRequestFunction: async ({ request, error }) => {
            // This function is called when crawling of a request failed too many time
            const defaultStore = await Apify.openKeyValueStore();
            await Apify.pushData({
                '#url': request.url,
                '#succeeded': false,
                '#errors': request.errorMessages,
                '#debugInfo': Apify.utils.createRequestDebugInfo(request),
                '#debugFiles': {
                    html: defaultStore.getPublicUrl(`${request.id}.html`),
                    screen: defaultStore.getPublicUrl(`${request.id}.png`),
                }
            });
            log.exception(error, `Page ${request.url} failed ${MAX_PAGE_RETRIES} times! It will not be retired. Check debug fields in dataset to find the issue.`)
        },
    });
};

module.exports = { setUpCrawler };
