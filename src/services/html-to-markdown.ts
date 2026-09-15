import * as cheerio from "cheerio";

const DROP = "script, style, nav, footer, header, aside, iframe, noscript, svg, form";

export function looksLikeMarkdown(text: string): boolean {
  const sample = text.slice(0, 2000);
  const mdHits =
    (sample.match(/^#{1,6} /gm) ?? []).length +
    (sample.match(/```/g) ?? []).length +
    (sample.match(/^\- /gm) ?? []).length;
  const htmlHits = (sample.match(/<\/?[a-z][\s\S]*?>/gi) ?? []).length;
  return mdHits >= 2 && htmlHits < 8;
}

export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  $(DROP).remove();

  $("pre").each((_, el) => {
    const lang = ($(el).find("code").attr("class") ?? "").replace(/.*language-/, "").trim();
    const code = ($(el).find("code").text() || $(el).text()).replace(/\n$/, "");
    $(el).replaceWith(`\n\`\`\`${lang}\n${code}\n\`\`\`\n`);
  });

  $("code").each((_, el) => {
    $(el).replaceWith(`\`${$(el).text()}\``);
  });

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const label = $(el).text() || href || "";
    $(el).replaceWith(href ? `[${label}](${href})` : label);
  });

  $("h1,h2,h3,h4,h5,h6").each((_, el) => {
    const n = Number(el.tagName[1]);
    $(el).replaceWith(`\n${"#".repeat(Number.isFinite(n) ? n : 2)} ${$(el).text().trim()}\n`);
  });

  $("li").each((_, el) => {
    $(el).replaceWith(`- ${$(el).text().trim()}\n`);
  });

  $("p, div, section, article, br").each((_, el) => {
    const t = $(el).text().trim();
    $(el).replaceWith(`\n${t}\n`);
  });

  const root =
    $("article").first().length > 0
      ? $("article").first()
      : $("main").first().length > 0
        ? $("main").first()
        : $("body");

  return root
    .text()
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function toCleanMarkdown(body: string, contentType = ""): string {
  const type = contentType.toLowerCase();
  if (type.includes("markdown") || looksLikeMarkdown(body)) {
    return body.replace(/\n{3,}/g, "\n\n").trim();
  }
  if (type.includes("html") || /<\/?[a-z][\s\S]*?>/i.test(body.slice(0, 4000))) {
    return htmlToMarkdown(body);
  }
  return body.trim();
}
