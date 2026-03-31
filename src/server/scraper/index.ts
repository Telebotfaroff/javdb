import axios from 'axios';
import {
  cleanHtmlText,
  htmlToText,
  isExcluded,
  extractLabeledSingle,
  getHighQualityPoster,
  extractImageUrl,
  extractGenres,
  extractAbout,
  extractSimilarMovies
} from './utils';

const client = axios.create({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
});

async function fetchRealStreamingLinks(dvdId: string) {
  const links: any[] = [];
  const id = dvdId.toLowerCase();
  console.log(`Fetching streaming links for: ${id}`);
  
  const promises = [
    client.get(`https://missav.ws/en/search/${encodeURIComponent(id)}`, { timeout: 5000 })
      .then(resp => {
        // Match either old .com or new .ws domain on MissAV links
        const match = resp.data.match(new RegExp(`href="([^"]*(?:missav\\.com|missav\\.ws)/[^\"]*${id}[^\"]*)"`, 'i'));
        if (match) {
          console.log(`MissAV match found: ${match[1]}`);
          links.push({ site: 'MissAV', url: match[1] });
        } else {
          console.log(`No MissAV match for ${id}`);
        }
      }).catch((e: any) => {
        console.error(`MissAV (ws) error for ${id}:`, e.message);
        // fallback to .com
        return client.get(`https://missav.com/en/search/${encodeURIComponent(id)}`, { timeout: 5000 })
          .then(resp => {
            const match = resp.data.match(new RegExp(`href="([^"]*(?:missav\\.com|missav\\.ws)/[^\"]*${id}[^\"]*)"`, 'i'));
            if (match) {
              console.log(`MissAV (.com fallback) match found: ${match[1]}`);
              links.push({ site: 'MissAV', url: match[1] });
            } else {
              console.log(`No MissAV match for ${id} (fallback)`);
            }
          }).catch((e2: any) => console.error(`MissAV (.com fallback) error for ${id}:`, e2.message));
      }),
    client.get(`https://jable.tv/search/${encodeURIComponent(id)}/`, { timeout: 5000 })
      .then(resp => {
        // More permissive regex
        const match = resp.data.match(new RegExp(`href="([^"]*jable\\.tv/[^"]*${id}[^"]*)"`, 'i'));
        if (match) {
          console.log(`Jable match found: ${match[1]}`);
          links.push({ site: 'Jable', url: match[1] });
        } else {
          console.log(`No Jable match for ${id}`);
        }
      }).catch(e => console.error(`Jable error for ${id}:`, e.message)),

  ];
  
  await Promise.allSettled(promises);
  console.log(`Found ${links.length} streaming links for ${id}`);
  return links;
}

export async function fetchMovieMetadata(pageUrl: string, includeStreamingLinks = true) {
  try {
    const resp = await client.get(pageUrl);
    const html = resp.data || '';
    const meta: any = {};
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
    meta.title = titleMatch ? cleanHtmlText(titleMatch[1]) : null;
    const ogImageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
    const twitterImageMatch = html.match(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/i);
    
    const posterContainer = html.match(/<div[^>]+class="[^"]*\bposter\b[^"]*"[^>]*>(.*?)<\/div>/is) ||
                            html.match(/<div[^>]+id="poster"[^>]*>(.*?)<\/div>/is);
    
    let poster = posterContainer ? extractImageUrl(posterContainer[1]) : null;
    
    if (!poster) {
      const imgMatch = ogImageMatch || twitterImageMatch;
      poster = imgMatch ? imgMatch[1] : null;
    }
    
    if (!poster) {
      poster = extractImageUrl(html);
    }
    
    if (poster && poster.startsWith('//')) poster = 'https:' + poster;
    if (poster && poster.startsWith('/')) poster = 'https://www.javdatabase.com' + poster;
    meta.poster = getHighQualityPoster(poster);
    const pageText = htmlToText(html);
    function extractField(patterns: string[], maxWords: number | null = null) {
      for (const pat of patterns) {
        const m = pageText.match(new RegExp(`${pat}\\s*[:\\-–]?\\s*(.*?)\\s*(?:\\n|$)`, 'i'));
        if (m) {
          let val = m[1].trim().replace(/\s{2,}/g, ' ');
          if (maxWords) val = val.split(' ').slice(0, maxWords).join(' ');
          return val;
        }
      }
      return null;
    }
    meta.dvdId = extractLabeledSingle(html, 'DVD ID') || extractField(['DVD ID', 'DVD'], 4);
    meta.releaseDate = extractLabeledSingle(html, 'Release Date') || extractField(['Released'], 4);
    meta.runtime = extractLabeledSingle(html, 'Runtime') || extractField(['Runtime'], 8);
    meta.studio = extractLabeledSingle(html, 'Studio') || extractField(['Studio'], 8);
    meta.actress = extractLabeledSingle(html, 'Actress') || extractField(['Actress'], 8);
    meta.director = extractLabeledSingle(html, 'Director') || extractField(['Director'], 8);
    meta.contentId = extractLabeledSingle(html, 'Content ID') || extractField(['Content ID'], 4);
    meta.genres = extractGenres(html);
    meta.plot = extractAbout(html);
    meta.similarMovies = extractSimilarMovies(html);
    
    const screenshots: string[] = [];
    const galleryMatch = html.match(/<div[^>]+id="[^"]*gallery[^"]*"[^>]*>(.*?)<\/div>\s*<\/div>/is) || html.match(/<div[^>]+class="[^"]*gallery[^"]*"[^>]*>(.*?)<\/div>\s*<\/div>/is);
    if (galleryMatch) {
      const imgRegex = /<a[^>]+href="([^"]+)"[^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(galleryMatch[1])) !== null) {
        let url = match[1];
        if (url.match(/\.(jpg|jpeg|png|webp)$/i)) {
          if (url.startsWith('//')) url = 'https:' + url;
          if (url.startsWith('/')) url = 'https://www.javdatabase.com' + url;
          screenshots.push(url);
        }
      }
    }
    
    if (screenshots.length === 0) {
      const imgRegex = /<a[^>]+href="([^"]+)"[^>]*>\s*<img[^>]+src="[^"]*thumbs?[^"]*"[^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        let url = match[1];
        if (url.match(/\.(jpg|jpeg|png|webp)$/i)) {
          if (url.startsWith('//')) url = 'https:' + url;
          if (url.startsWith('/')) url = 'https://www.javdatabase.com' + url;
          screenshots.push(url);
        }
      }
    }
    
    meta.screenshots = [...new Set(screenshots)];
    
    if (meta.dvdId) {
      if (includeStreamingLinks) {
        const realLinks = await fetchRealStreamingLinks(meta.dvdId);
        if (realLinks.length > 0) {
          meta.streamingLinks = realLinks;
        } else {
          meta.streamingLinks = [
            { site: 'MissAV', url: `https://missav.com/en/search/${encodeURIComponent(meta.dvdId || '')}` },
            { site: 'Jable', url: `https://jable.tv/search/${encodeURIComponent(meta.dvdId || '')}/` },
            { site: 'SupJav', url: `https://supjav.com/?s=${encodeURIComponent(meta.dvdId || '')}` },
            { site: 'JavHD', url: `https://javhd.today/search/${encodeURIComponent(meta.dvdId || '')}` },
            { site: 'JavMost', url: `https://www5.javmost.com/search/${encodeURIComponent(meta.dvdId || '')}/` },
            { site: 'JavBangers', url: `https://javbangers.com/search/${encodeURIComponent(meta.dvdId || '')}` },
            { site: 'JavSeen', url: `https://javseen.tv/search/${encodeURIComponent(meta.dvdId || '')}` }
          ];
        }
      } else {
        meta.streamingLinks = [];
      }
    } else {
      meta.streamingLinks = [];
    }

    return meta;
  } catch (e) {
    console.error('Metadata error:', e);
    return {};
  }
}

export async function fetchActressDetails(name: string) {
  try {
    const searchResults = await fetchSearch(name, 'actress', 1);
    if (searchResults.length === 0) return null;
    
    const bestMatch = searchResults.find(r => r.title?.toLowerCase() === name.toLowerCase()) || searchResults[0];
    if (!bestMatch.link) return null;
    
    const resp = await client.get(bestMatch.link);
    const html = resp.data || '';
    
    const actressImageBlock = html.match(/<div[^>]+class="[^"]*\bactress-image\b[^"]*"[^>]*>(.*?)<\/div>/is) || 
                              html.match(/<div[^>]+class="[^"]*\bwp-post-image\b[^"]*"[^>]*>(.*?)<\/div>/is);
    
    let profilePic = actressImageBlock ? extractImageUrl(actressImageBlock[1]) : null;
    if (!profilePic) profilePic = extractImageUrl(html);
    if (!profilePic) profilePic = bestMatch.poster;
    if (profilePic && profilePic.startsWith('//')) profilePic = 'https:' + profilePic;
    if (profilePic && profilePic.startsWith('/')) profilePic = 'https://www.javdatabase.com' + profilePic;
    profilePic = getHighQualityPoster(profilePic);
    
    return {
      name: bestMatch.title || name,
      profilePic: profilePic,
      link: bestMatch.link
    };
  } catch (e) {
    console.error('Actress details error:', e);
    return null;
  }
}

export async function fetchSearch(query: string, type: 'movie' | 'actress' | 'studio' = 'movie', page: number = 1) {
  try {
    let postType = 'movies%2Cuncensored';
    if (type === 'actress') postType = 'actress';
    if (type === 'studio') postType = 'studio';
    const resp = await client.get(`https://www.javdatabase.com/?post_type=${postType}&s=${encodeURIComponent(query)}&paged=${page}`);
    const html = resp.data || '';
    const results = [];
    const blocks = html.split(/<div[^>]+class="[^"]*\bcard\b[^"]*\bborderlesscard\b[^"]*"[^>]*>/i);
    
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i].split(/<\/div>\s*<!--\s*card\s*-->/i)[0];
      let code = null, link = null, title = null;
      const codeMatch = block.match(/<p[^>]+class="[^"]*\bpcard\b[^"]*"[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/is);
      if (codeMatch) { link = codeMatch[1]; code = cleanHtmlText(codeMatch[2]); }
      const titleBlock = block.match(/<(?:div|p|span)[^>]+class="[^"]*\bmt-auto\b[^"]*"[^>]*>(.*?)<\/(?:div|p|span)>/is);
      if (titleBlock) {
        const t = titleBlock[1].match(/<a[^>]*>(.*?)<\/a>/is);
        if (t) title = cleanHtmlText(t[1]);
      }
      let poster = extractImageUrl(block);
      if (poster && poster.startsWith('//')) poster = 'https:' + poster;
      if (poster && poster.startsWith('/')) poster = 'https://www.javdatabase.com' + poster;
      poster = getHighQualityPoster(poster);
      const dateMatch = block.match(/(\d{4}-\d{2}-\d{2})/);
      const releaseDate = dateMatch ? dateMatch[1] : undefined;
      const studioMatch = block.match(/<a[^>]+href="[^"]*studio[^"]*"[^>]*>(.*?)<\/a>/i);
      const studio = studioMatch ? cleanHtmlText(studioMatch[1]) : undefined;
      const actressMatch = block.match(/<a[^>]+href="[^"]*actress[^"]*"[^>]*>(.*?)<\/a>/i);
      const actress = actressMatch ? cleanHtmlText(actressMatch[1]) : undefined;
      results.push({ code, title, link, poster, releaseDate, studio, actress });
    }
    return results.filter(r => r.link && !isExcluded(r.link));
  } catch (e: any) {
    if (e.response && e.response.status === 404) {
      return [];
    }
    console.error('Search error:', e);
    return [];
  }
}
