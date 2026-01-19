"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citySeoHandler = citySeoHandler;
exports.sitemapHandler = sitemapHandler;
exports.robotsHandler = robotsHandler;
const publicSeo_service_1 = require("./publicSeo.service");
async function citySeoHandler(req, res) {
    const slug = req.params.citySlug;
    if (!slug || !(0, publicSeo_service_1.isValidCitySlug)(slug)) {
        return res.status(404).json({ ok: false, error: { message: "City not found", code: "NOT_FOUND" } });
    }
    const data = (0, publicSeo_service_1.buildCitySeo)(slug);
    res.json({ ok: true, data });
}
async function sitemapHandler(_req, res) {
    try {
        const xml = await (0, publicSeo_service_1.generateSitemapXml)();
        res.header("Content-Type", "application/xml");
        res.send(xml);
    }
    catch (err) {
        res.status(500).send("Error generating sitemap");
    }
}
function robotsHandler(_req, res) {
    res.header("Content-Type", "text/plain");
    res.send((0, publicSeo_service_1.robotsTxt)());
}
