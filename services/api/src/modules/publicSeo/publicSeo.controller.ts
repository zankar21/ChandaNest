import { Request, Response } from "express";
import { buildCitySeo, generateSitemapXml, isValidCitySlug, robotsTxt } from "./publicSeo.service";

export async function citySeoHandler(req: Request, res: Response) {
  const slug = req.params.citySlug;
  if (!slug || !isValidCitySlug(slug)) {
    return res.status(404).json({ ok: false, error: { message: "City not found", code: "NOT_FOUND" } });
  }
  const data = buildCitySeo(slug);
  res.json({ ok: true, data });
}

export async function sitemapHandler(_req: Request, res: Response) {
  try {
    const xml = await generateSitemapXml();
    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err: any) {
    res.status(500).send("Error generating sitemap");
  }
}

export function robotsHandler(_req: Request, res: Response) {
  res.header("Content-Type", "text/plain");
  res.send(robotsTxt());
}
