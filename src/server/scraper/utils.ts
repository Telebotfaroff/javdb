export function cleanHtmlText(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function htmlToText(html: string): string {
  if (!html) return '';
  html = html.replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])[^>]*>/gi, '\n');
  html = html.replace(/<[^>]+>/g, ' ');
  html = html.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;/g, s =>
    ({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"'}[s] || s));
  return html.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l).join('\n');
}

export function isExcluded(link: string | null): boolean {
  if (!link) return false;
  const excludedDomains = ['spermmania.com', 'fellatiojapan.com', 'cospuri.com'];
  return excludedDomains.some(domain => link.includes(domain));
}

export function extractLabeledSingle(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<(?:p|div|li)[^>]*>\\s*<b[^>]*>[^<]*${escaped}[^<]*</b>\\s*[:\\-–]?\\s*(.*?)</(?:p|div|li)>`, 'i');
  const m = html.match(pattern);
  if (!m) return null;
  let block = m[1].replace(/<b[^>]*>.*?<\/b>/i, '').split(/<b[^>]*>/)[0].replace(/<br\s*\/?>/gi, '\n');
  const firstLine = block.split('\n').find(l => l.trim()) || '';
  return cleanHtmlText(firstLine);
}

export function getHighQualityPoster(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('data:image')) return null;
  
  let highRes = url;

  if (highRes.includes('covers/thumb/')) {
    highRes = highRes.replace('covers/thumb/', 'covers/full/');
  } else if (highRes.includes('thumbs/')) {
    highRes = highRes.replace('thumbs/', 'covers/full/');
  }

  if (highRes.includes('ps.jpg')) {
    highRes = highRes.replace('ps.jpg', 'pl.jpg');
  } else if (highRes.includes('ps.webp')) {
    highRes = highRes.replace('ps.webp', 'pl.webp');
  } else if (highRes.match(/-\d+\.jpg$/)) {
    highRes = highRes.replace(/-\d+\.jpg$/, '.jpg');
  } else if (highRes.includes('_s.jpg')) {
    highRes = highRes.replace('_s.jpg', '_l.jpg');
  } else if (highRes.includes('_t.jpg')) {
    highRes = highRes.replace('_t.jpg', '_c.jpg');
  }
  
  return highRes;
}

export function extractImageUrl(html: string): string | null {
  const imgTag = html.match(/<img[^>]+>/i);
  if (!imgTag) return null;
  const tag = imgTag[0];
  
  const attrs = ['data-original', 'data-src', 'data-lazy-src', 'data-srcset', 'src'];
  for (const attr of attrs) {
    const m = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
    if (m) {
      let url = m[1].trim();
      if (attr === 'data-srcset') {
        url = url.split(',')[0].split(' ')[0];
      }
      if (url && !url.startsWith('data:image')) {
        return url;
      }
    }
  }
  return null;
}

export function extractGenres(html: string): string[] {
  const label = "Genre";
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<(?:p|div|li)[^>]*>\\s*<b[^>]*>[^<]*${escaped}[^<]*</b>\\s*[:\\-–]?\\s*(.*?)</(?:p|div|li)>`, 'i');
  const m = html.match(pattern);
  if (!m) return [];
  const links = m[1].match(/<a[^>]*>(.*?)<\/a>/gi);
  if (!links) {
    const text = cleanHtmlText(m[1]);
    return text.split(',').map(s => s.trim()).filter(s => s);
  }
  return links.map(l => cleanHtmlText(l));
}

export function extractAbout(html: string): string | null {
  const heading = html.match(/<h[1-6][^>]*>[^<]*About[^<]*JAV Movie[^<]*<\/h[1-6]>/is);
  let block = '';
  if (heading) {
    block = html.slice(heading.index! + heading[0].length).split(/<h[1-6][^>]*>/is)[0];
  } else {
    const m = html.match(/About[^<]*JAV Movie(.*)/is);
    if (m) block = m[1].split(/<h[1-6][^>]*>/is)[0];
  }
  if (!block) return null;
  let text = htmlToText(block)
    .replace(/\(No Ratings Yet\).*/g, '')
    .replace(/No Ratings Yet.*/g, '')
    .replace(/Loading\.+.*/g, '')
    .replace(/JAV Database only provides official.*$/gm, '');
  return text.split('\n').map(l => l.trim()).filter(l => l).join('\n').trim() || null;
}

export function extractSimilarMovies(html: string) {
  const similarHeading = html.match(/<h[1-6][^>]*>[^<]*(?:Similar|Related)[^<]*<\/h[1-6]>/is);
  if (!similarHeading) return [];
  const block = html.slice(similarHeading.index! + similarHeading[0].length).split(/<h[1-6][^>]*>/is)[0];
  const results = [];
  const blocks = block.split(/<div[^>]+class="[^"]*\bcard\b[^"]*\bborderlesscard\b[^"]*"[^>]*>/i);
  
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i].split(/<\/div>\s*<!--\s*card\s*-->/i)[0];
    let code = null, link = null, title = null;
    const codeMatch = b.match(/<p[^>]+class="[^"]*\bpcard\b[^"]*"[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/is);
    if (codeMatch) { link = codeMatch[1]; code = cleanHtmlText(codeMatch[2]); }
    const titleBlock = b.match(/<(?:div|p|span)[^>]+class="[^"]*\bmt-auto\b[^"]*"[^>]*>(.*?)<\/(?:div|p|span)>/is);
    if (titleBlock) {
      const t = titleBlock[1].match(/<a[^>]*>(.*?)<\/a>/is);
      if (t) title = cleanHtmlText(t[1]);
    }
    let poster = extractImageUrl(b);
    if (poster && poster.startsWith('//')) poster = 'https:' + poster;
    if (poster && poster.startsWith('/')) poster = 'https://www.javdatabase.com' + poster;
    poster = getHighQualityPoster(poster);
    if (link && !isExcluded(link)) results.push({ code, title, link, poster });
  }
  return results;
}
