const { waitForBingMapLoading } = require('./utils');
const { DEFAULT_TIMEOUT } = require('./consts');

const extractData = async (page, request) => {
    const { searchString } = request.userData;
    // Extract basic information
    await waitForBingMapLoading(page);
    // await page.waitForSelector(PLACE_TITLE_SEL, { timeout: DEFAULT_TIMEOUT });
    await page.click('input#maps_sb');
    await page.type('input#maps_sb', searchString, { delay: 120 });
    await page.waitFor(500);
    // await page.keyboard.press('Enter');
    await page.waitForSelector('#as_containerSearch ul', { timeout: DEFAULT_TIMEOUT });
    await page.click('#as_containerSearch ul li:first-child');
    await page.waitForSelector('.overlay-container div.maps-variant.local-taskpane', { timeout: DEFAULT_TIMEOUT });

    // return;
    const detailsObjRaw = await page.evaluate(() => {
        const data = document.querySelector('.taskCard:not(.hidden) .overlay-container div.maps-variant.local-taskpane').attributes['data-facts'].value;
        const socialLinks = [];
        document.querySelectorAll('.taskCard:not(.hidden) .overlay-container .infoCardIcons #iconset_1 ul.b_hList li').forEach((el) => {
            const socialName = el.querySelector('a > span').textContent.toLowerCase();
            const socialLink = el.querySelector('a').href;
            socialLinks.push({
                name: socialName,
                url: socialLink,
            });
        });
        return {
            data,
            socialLinks,
        };
    });
    const details = JSON.parse(detailsObjRaw.data);
    const formattedDetails = { ...details, WebResources: undefined };
    formattedDetails.socialLinks = detailsObjRaw.socialLinks;

    // Include search string
    formattedDetails.searchString = searchString;
    return formattedDetails;
};

module.exports = {
    extractData,
};
