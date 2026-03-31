import { Router } from "express";
import { fetchSearch, fetchMovieMetadata, fetchActressDetails } from "./scraper/index";

export const apiRouter = Router();

apiRouter.get("/search", async (req, res) => {
  const query = req.query.q as string;
  const type = (req.query.type as 'movie' | 'actress' | 'studio') || 'movie';
  const page = parseInt(req.query.page as string) || 1;
  if (!query) return res.status(400).json({ error: "Missing query" });
  const results = await fetchSearch(query, type, page);
  
  // Fetch details for each result (this will be slow)
  const detailedResults = await Promise.all(results.map(async (movie: any) => {
    const details = await fetchMovieMetadata(movie.link, false);
    return { ...movie, plot: details.plot, poster: details.poster || movie.poster, dvdId: details.dvdId };
  }));
  
  res.json(detailedResults);
});

apiRouter.get("/search-fast", async (req, res) => {
  const query = req.query.q as string;
  const type = (req.query.type as 'movie' | 'actress' | 'studio') || 'movie';
  const page = parseInt(req.query.page as string) || 1;
  if (!query) return res.status(400).json({ error: "Missing query" });
  const results = await fetchSearch(query, type, page);
  
  // Return results without fetching full metadata for each to be fast
  res.json(results);
});

apiRouter.get("/actress", async (req, res) => {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ error: "Missing name" });
  const details = await fetchActressDetails(name);
  res.json(details);
});

apiRouter.get("/movie", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "Missing URL" });
  const details = await fetchMovieMetadata(url);
  res.json(details);
});
