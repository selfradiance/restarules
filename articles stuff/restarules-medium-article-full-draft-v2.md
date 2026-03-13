# AI Agents Are Calling Restaurants. Restaurants Can't Talk Back.

---

A few months ago, a developer at a tech conference described an experiment gone sideways. He'd set two AI agents loose on a problem overnight. By morning, the problem was solved — but the agents were still going. They'd gotten stuck in an infinite loop of politeness, endlessly thanking each other for their contributions. Hours of compute, burned on robotic small talk.

It was funny. It was also a preview of something bigger.

Because AI agents aren't just talking to each other anymore. They're talking to us. They're calling restaurants during the dinner rush. They're browsing reservation platforms and snapping up tables. Google's AI Mode already lets you say "find me a dinner reservation for three people this Friday, craving ramen" — and it searches across OpenTable, Resy, and Tock in real time to book you a spot. That feature went live in 2025. It's not coming. It's here.

And some of what's happening is less charming than a politeness loop. Bots have been mass-booking hard-to-get reservations and reselling them for hundreds of dollars — sometimes over a thousand. One platform alone facilitated roughly $7 million in reservation resales. Reservation data from Resy showed that no-show rates for suspected bots and brokers were four times higher than normal diners.

Restaurants described the situation as [existential](https://www.foxbusiness.com/lifestyle/restaurateur-says-fighting-our-lives-against-reservation-scalping-trend). New York responded by passing the Restaurant Reservation Anti-Piracy Act, which took effect in early 2025 with fines of up to [$1,000 per violation per day](https://www.hklaw.com/en/insights/publications/2025/02/new-york-curbs-scalping-of-restaurant-reservations). Philadelphia followed with similar legislation. These aren't hypothetical policy debates — they're laws on the books, written because the problem got bad enough to force lawmakers to act.

But here's the thing those laws can't fix: even well-intentioned AI agents — the ones built by Google, by startups, by developers trying to do something useful — have no way to know what a restaurant's rules are. Should the agent disclose that it's not a human? Are phone reservations okay, or does the restaurant prefer web-only? Is there a deposit required for large parties? What's the cancellation policy? Is rebooking or transferring a reservation allowed?

Right now, there's no machine-readable way for a restaurant to answer those questions. No standard file, no common format, no sign on the door that an AI agent can read.

I built one. It's called RestaRules.

---

## The sign on the door

Every restaurant has house rules. Some are on the wall, some are on the website, some are just things the host knows. No-show policy. Deposit for parties over six. "Please let us know if you're booking on behalf of someone else." Dress code. Cancellation window.

Humans handle this fine. You read the sign. You ask the host. You figure it out.

AI agents can't do any of that. They can't read a sign on the wall. They can't pick up on social cues. And right now, there's no standard way for a restaurant to publish its rules in a format that an AI agent can actually understand and follow.

The big reservation platforms — OpenTable, Resy, Tock — enforce their own rules inside their own systems. But AI agents don't have to come through those doors. They can call. They can browse the website. They can use any channel they want. The platforms' walls don't reach that far.

I couldn't find an existing open standard that solves this in the restaurant context. So I built a proposal for one.

RestaRules is a simple, structured file that a restaurant puts on their website. It lives in a standard location — the same kind of special folder that websites already use to publish files for search engines and security policies. Any AI agent that's about to interact with that restaurant can check the file first, read the rules, and follow them.

The rules themselves are things any restaurant owner would recognize: Do you have to disclose that you're an AI? What booking channels are you allowed to use — phone, web, app? How many booking attempts can you make per hour? Do parties over a certain size need a human to handle the reservation? Is a deposit required? What's the cancellation policy? What's the no-show fee? Can you transfer or resell a booking?

The restaurant writes the rules. The AI agent reads them and obeys. That's the core idea.

*[Diagram: A simple flow — Restaurant writes rules → Rules file lives on their website → AI agent checks the file before acting → Allowed? Proceed. Not allowed? Stop or escalate to a human.]*

If the pattern sounds familiar, that's because the web already works this way. Search engines follow robots.txt. Security teams use security.txt. RestaRules applies the same idea to a new problem: how AI agents interact with restaurants.

---

## What this is not

Before going further, let me draw some clear lines — because the most common reaction to hearing about this project is to assume it's something it isn't.

RestaRules is not a reservation platform. That's what OpenTable and Resy do. It's not a bot blocker — that's Cloudflare's job. It's not a voice AI receptionist — there's a whole industry building those. And it's not a booking protocol — other projects are working on the mechanics of how AI agents actually make and manage reservations.

RestaRules is specifically the conduct and consent layer. It's the set of rules that any agent must follow, regardless of which platform, protocol, or channel they're using. It sits underneath all of those.

And it's not a product. It's not a business. It's an open-source proposal — a working prototype that says "here's what this could look like." I built it because the gap seemed real, not because I'm trying to sell anything.

Like robots.txt, the system is designed for responsible agents — not attackers. Bad actors will ignore any rules file, just as bad actors ignore robots.txt today. The point is to give legitimate agents a clear, cheap way to do the right thing.

---

## Why this matters right now

The forces pushing toward something like this are converging from multiple directions at once.

Google launched its Universal Commerce Protocol in January 2026 — an open standard for AI agents to shop, compare, and transact across the web. AI agents aren't just answering questions anymore; they're becoming buyers, bookers, and callers.

Meanwhile, the EU AI Act takes effect in August 2026, and among its requirements is that AI must identify itself in certain interactions. That's a disclosure rule — exactly the kind of thing a restaurant would want to specify in a machine-readable format.

On the industry side, AI voice agents — robot receptionists that answer restaurant phones — are one of the fastest-growing segments in restaurant technology. Companies are building them, restaurants are adopting them, and the number of AI-to-human and AI-to-AI phone interactions is climbing fast. Every one of those interactions is a moment where the AI agent needs to know: what are the house rules here?

The legislation showed that the pain is real enough to regulate. The technology standards from Google and the EU show that the infrastructure is being built. And the explosion of AI voice agents shows that the interactions are already happening at scale.

What's missing is a simple, open, portable way for the restaurant to say: "Here are my rules. Follow them."

---

## What I actually built

Most conversations about AI governance stop at theory — papers and principles. I wanted to see if the idea could actually work as a real, functioning system. So I built one, end to end.

**The rules.** I designed a formal definition of what a restaurant's rules file looks like — what information it contains, which parts are required, which are optional — so that any machine can read it predictably. There's a live demo restaurant — a fictional Italian place called Bella Notte Trattoria — with a real rules file published on the web right now. You can [visit it in your browser](https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json) and see exactly what it looks like.

**The tools.** I built a validator that reads a restaurant's rules file and tells you whether it's properly formatted. I built a demo AI agent — a simple program that goes to a restaurant's website, finds the rules file, reads it, and makes compliance decisions. "Can I book a table for eight people by phone?" It checks the rules and gives you an answer: allowed, denied, or "you need to talk to a human first." And I packaged the core logic into a plug-in kit that any developer building an AI agent could drop into their project to add rules-checking in minutes.

**The proof.** Here's the part you can try yourself. I built a [voice demo](https://selfradiance.github.io/restarules/demo/voice/) — a web page where you click a scenario and hear an AI agent speak its reasoning out loud. It fetches real rules from the live demo restaurant, runs them through the real plug-in kit, and talks you through what it found. "Disclosure is required. I must identify myself as an AI agent." "Party size exceeds the auto-book maximum. Escalating to a human." You can hear the agent think through the rules in real time. Open it in Chrome and try it.

Behind all of this, there's an automated safety net — a full test suite that checks every part of the system whenever a change is made. Every push to the [public code repository](https://github.com/selfradiance/restarules) triggers the full suite automatically. If anything breaks, it gets caught immediately.

This isn't a whitepaper. It's a working prototype you can try.

---

## Who benefits

If something like RestaRules were widely adopted, the benefits spread across the entire ecosystem — not just restaurants.

Restaurants get something they've never had before: a voice. A way to set boundaries with AI agents before those agents even knock on the door. Instead of reacting to bad behavior after the fact, they can publish their expectations up front.

AI agent builders get clarity. Instead of guessing what a restaurant allows — or worse, getting it wrong and causing a problem — they can check. And because checking costs almost nothing (it's a simple file on a website, no login required, loads in milliseconds), it removes the friction of playing by the rules.

Reservation platforms like OpenTable and Resy benefit from reduced fraud and clearer rules across the ecosystem — including rules that apply outside their own walled gardens.

Voice AI companies — the ones building robot receptionists for restaurants — could adopt this as a standard configuration format. Instead of each company inventing its own way to store restaurant preferences, there's a shared format everyone can read.

And diners? Diners benefit because the whole system gets more honest. AI agents have to play by the house rules, just like everyone else who walks through the door.

---

## Try it, break it, tell me what's wrong

RestaRules is an open-source project. The [code is public](https://github.com/selfradiance/restarules). The [demo is live](https://selfradiance.github.io/restarules/demo/voice/). Everything is free.

I didn't set out to build a product. I wanted to see if the idea could actually work — if you could define a real format, build real tools around it, and demonstrate the whole loop from "restaurant writes rules" to "AI agent obeys them." Turns out you can. At least in prototype.

I don't know if this specific project is the one that catches on. Maybe someone takes the idea and builds something better. Maybe a platform or a standards body picks up the pattern. That would be fine. The point was never to own the standard — it was to prove that the standard is possible, and to show what it could look like.

I built this because the gap seemed real. If you think I'm wrong, I'd like to hear why. If you think it's missing something, open an issue on the repo. If you're building AI agents that interact with restaurants — or any business, really — take a look at how the rules file works and imagine what it could do in your system.

I'm a retired guy who noticed a gap and wanted to see if he could fill it. This is what I found.

---

*RestaRules is open source and available at [github.com/selfradiance/restarules](https://github.com/selfradiance/restarules). The live voice demo is at [selfradiance.github.io/restarules/demo/voice](https://selfradiance.github.io/restarules/demo/voice/).*
