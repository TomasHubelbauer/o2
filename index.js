const tls = require('tls');
const fetch = require('node-fetch');
const fs = require('fs-extra');
let email;
try {
  email = require('../self-email');
} catch (error) {
  // Ignore the notifier not existing on some systems
}

module.exports = (
  async function () {
    // Enable TLS1 to be able to fetch O2 Arena's shitty-ass website
    tls.DEFAULT_MIN_VERSION = 'TLSv1';
    const response = await fetch('https://www.o2arena.cz/en/events/');
    const text = await response.text();
    const regex = /<div class="event_preview toLeft">\s+<div class="eye_catcher" style="background: url\((?<imageLink>https:\/\/www.o2arena.cz\/data\/medias\/\d+\/400x400.jpg)\) no-repeat 50% 50%; background-size: cover;" onclick="[^"]+">\s+(<a href=(?<ticketsLink>"[^"]+)" class="tickets_link" target="_blank">Buy tickets<\/a>)?\s+<\/div>\s+<p class="time">(?<time>[^<]+)<\/p>\s+<h3><a href="(?<link>https:\/\/www.o2arena.cz\/en\/events(_group)?\/(?<id>[^"]+).html)">(?<title>[^<]+)<\/a><\/h3>\s+<\/div>/gm;
    let match;
    const events = {};
    while (match = regex.exec(text)) {
      const event = match.groups;
      events[event.id] = event;
    }

    const storedEvents = await fs.readJson('events.json');
    for (const id of Object.keys(events)) {
      if (!storedEvents[id]) {
        await email(`
From: O2 Arena <bot@hubelbauer.net>
To: Tom Hubelbauer <tomas@hubelbauer.net>
Subject: ${events[id].title} in O2 Arena
Content-Type: text/html

<a href="${events[id].link}">${events[id].title}</a>
<br />
<img src="${events[id].imageLink}" />
<br />

Thank you
`);
      }
    }

    await fs.writeJson('events.json', events, { spaces: 2 });
  }
)();
