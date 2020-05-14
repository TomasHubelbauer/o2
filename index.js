const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');

module.exports = async function () {
  // Ignore SSL errors to be able to fetch O2 Arena's shitty-ass website
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const venues = [
    { request: 'https://www.o2arena.cz/en/events/', name: 'o2-arena' },
    { request: 'http://o2universum.cz/en/events/', name: 'o2-universum' },
  ];

  const indexEmlFilePath = path.join(__dirname, 'index.eml');
  await fs.writeFile(indexEmlFilePath, '');
  for (const venue of venues) {
    const response = await fetch(venue.request);
    const text = await response.text();
    const regex = /<div class="event_preview toLeft">\s+<div class="eye_catcher"\s+style="background: url\((?<imageLink>https:\/\/www.o2(arena|universum).cz\/.*\.jpg)\) no-repeat 50% 50%; background-size: cover;"\s+onclick="[^"]+">\s+(<a href=(?<ticketsLink>"[^"]+)" class="tickets_link" target="_blank">Buy tickets<\/a>)?\s+<\/div>\s+<p class="time">(?<time>[^<]*)<\/p>\s+<h3><a href="(?<link>https:\/\/www.o2(arena|universum).cz\/en\/events\/(?<id>[^"]+))\/">(?<title>[^<]+)<\/a>\s+<\/h3>\s+<\/div>/gm;
    if (!regex.test(text)) {
      throw new Error(`${venue.name} (${venue.request}) does not match the regex`);
    }

    let match;
    const events = {};
    while (match = regex.exec(text)) {
      const event = match.groups;
      events[event.id] = event;
    }

    const venueJsonFilePath = path.join(__dirname, venue.name + '.json');

    let storedEvents = [];
    try {
      storedEvents = await fs.readJson(venueJsonFilePath);
    }
    catch (error) {
      // Ignore missing file - first run experience
    }

    await fs.writeJson(venueJsonFilePath, events, { spaces: 2 });
    await fs.appendFile(indexEmlFilePath, `<p>${Object.keys(events).length} ${venue.name} events:</p>\n`);
    await fs.appendFile(indexEmlFilePath, '<ul>\n');
    for (const id of Object.keys(events)) {
      const isNew = !storedEvents[id];
      console.log(`${isNew ? 'Notifying about' : 'Already notified about'} ${events[id].title}`);
      await fs.appendFile(indexEmlFilePath, `<li><img height="40" src="${events[id].imageLink}" /> <a href="${events[id].link}">${events[id].title}</a> ${isNew ? '<b>NEW!</b>' : ''}</li>\n`);
    }

    await fs.appendFile(indexEmlFilePath, '</ul>\n');
  }
};

if (process.cwd() === __dirname) {
  module.exports();
}
