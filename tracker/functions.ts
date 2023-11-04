import { launch } from "puppeteer";

export const launchBrowserAndPage = async () => {
    const browser = await launch();
    const page = await browser.newPage();
    page.setViewport({
        width: 1440,
        height: 715,
    });
    return { browser, page };
}
