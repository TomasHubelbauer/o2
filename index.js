const tls = require('tls');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const email = require('../self-email');
const { eml, subject, sender, recipient } = require('../self-email');

module.exports = async function () {
  // Enable TLS1 to be able to fetch O2 Arena's shitty-ass website
  tls.DEFAULT_MIN_VERSION = 'TLSv1';

  const requests = [
    { url: 'https://www.o2arena.cz/en/events/', name: 'o2-arena' },
    { url: 'http://o2universum.cz/en/events/', name: 'o2-universum' },
  ];

  let newEvents = 0;
  for (const request of requests) {
    const response = await fetch(request.url);
    const text = await response.text();
    const regex = /<div class="event_preview toLeft">\s+<div class="eye_catcher" style="background: url\((?<imageLink>https:\/\/www.o2arena.cz\/data\/medias\/\d+\/400x400.jpg)\) no-repeat 50% 50%; background-size: cover;" onclick="[^"]+">\s+(<a href=(?<ticketsLink>"[^"]+)" class="tickets_link" target="_blank">Buy tickets<\/a>)?\s+<\/div>\s+<p class="time">(?<time>[^<]+)<\/p>\s+<h3><a href="(?<link>https?:\/\/(www.)?o2(arena|universum).cz\/en\/events(_group)?\/(?<id>[^"]+).html)">(?<title>[^<]+)<\/a><\/h3>\s+<\/div>/gm;
    let match;
    const events = {};
    while (match = regex.exec(text)) {
      const event = match.groups;
      events[event.id] = event;
    }

    const venueJsonFilePath = path.join(__dirname, request.name + '.json');
    let storedEvents = [];
    try {
      storedEvents = await fs.readJson(venueJsonFilePath);
    }
    catch (error) {
      // Ignore missing file - first run experience
    }

    for (const id of Object.keys(events)) {
      if (!storedEvents[id]) {
        await email(
          eml(
            subject(`${events[id].title} in ${request.name}`),
            sender('O2 <bot+o2@hubelbauer.net>'),
            recipient('Tomas Hubelbauer <tomas@hubelbauer.net>'),
            `<a href="${events[id].link}">${events[id].title}</a>`,
            '<br />',
            `<img src="${events[id].imageLink}" />`,
          )
        );

        newEvents++;
        console.log(`Notified about ${events[id].title}`);
      }
      else {
        console.log(`Already notified about ${events[id].title}`);
      }
    }

    await fs.writeJson(venueJsonFilePath, events, { spaces: 2 });
  }

  return `${newEvents} new events`;
};

if (process.cwd() === __dirname) {
  module.exports();
}
