// Prompts for each part of a study. Kept on the server so the passcode only unlocks Bible studies.
const COMMON = ref => `You are writing content for a visual Bible study page. The passage is: "${ref}".
Be historically careful. Follow mainstream scholarship, say "traditionally" or "probably" where dates, authorship or locations are debated, and never invent facts. Describe; do not preach, and do not favour one denomination. Write plain modern English in short sentences.
Reply with only one JSON object and no Markdown.`;

const P_SETTING = ref => COMMON(ref) + `
If this is not a recognisable Bible passage, reply {"valid":false,"reason":"one short sentence"} and nothing else.
Otherwise use this shape:
{"valid":true,
"reference":"canonical form, e.g. Acts 16–17",
"title":"3 to 7 word title",
"summary":"2 sentences on what happens or what the text is",
"date":{"label":"when the events are set, e.g. c. AD 49–50 or c. 1000 BC","note":"one short sentence on how firm that date is"},
"period":"who holds power and what era this is, one sentence",
"written":"one sentence on when and by whom the text was traditionally or probably written",
"places":[{"name":"ancient name","modern":"modern place and country","lat":0.0,"lon":0.0,"kind":"city|town|region|mountain|water|site","certainty":"known|approximate|traditional|uncertain","verses":"e.g. 16:11–12","role":"1 or 2 sentences on what happens here or why it is mentioned"}],
"regions":[{"name":"region or kingdom as it was called at the time","lat":0.0,"lon":0.0}],
"routes":[{"label":"e.g. Paul's journey","stops":["place names exactly as in places, in travel order"]}]}
Give 4 to 12 places in order of appearance, with decimal-degree coordinates as accurate as you can. For letters, poetry or prophecy with few places, include where it was written, who it was sent to, and places it names. Give 3 to 8 regions (centre points) for labelling the map. Give 0 to 3 routes, only where someone actually travels.`;

const P_SCENE = ref => COMMON(ref) + `
Shape:
{"scene":{"heading":"short heading","text":"120 to 170 words in the present tense putting the reader in one concrete moment of this passage: what you would see, hear, smell, wear, eat, and what the land and buildings look like. No invented dialogue and no invented characters."},
"context":[{"topic":"one of Politics, Religion, Daily life, Economy, Family, Geography, Law, Language, Warfare, Literature","title":"short title","text":"2 or 3 sentences"}],
"firstHearers":[{"point":"something the original audience took for granted that modern readers miss","text":"1 or 2 sentences on how it changes the reading"}],
"timeline":[{"when":"e.g. 722 BC","event":"short phrase","passage":false}]}
Give 5 to 7 context items on different topics, chosen for what most explains this passage. Give 3 to 5 firstHearers. Give 4 to 6 timeline entries in chronological order that lead up to and frame the passage; exactly one has "passage":true and marks the passage itself.`;

const P_WORDS = ref => COMMON(ref) + `
Pick the 6 to 8 words or short phrases in this passage where the gap between the original language and today's English matters most: words whose English meaning has drifted, idioms, wordplay, and terms that no single English word covers. Use Hebrew for the Old Testament (Aramaic for Daniel 2:4–7:28, Ezra 4:8–6:18 and 7:12–26, and other Aramaic verses) and Greek for the New Testament, noting an Aramaic or Hebrew word behind the Greek where that is relevant.
Shape:
{"words":[{"english":"the word or phrase exactly as it appears in verse","ref":"chapter:verse","verse":"that verse, or one clause of it, at most 30 words, in the World English Bible (public domain), containing the english phrase word for word","original":"the word or phrase in its own script, as it stands in the text (Hebrew with vowel points, Greek with accents)","lemma":"dictionary form in its own script if different, otherwise empty","translit":"transliteration","language":"Hebrew|Aramaic|Greek","literal":"the most literal gloss","senses":["3 to 5 short glosses showing the range of meaning"],"shift":"2 or 3 sentences on how today's English word differs in meaning, tone or association from the original","here":"1 or 2 sentences on what that adds to reading this passage"}]}`;

const FOOD_KEYS = "bread, fish, grapes, wine, olives, oil, figs, dates, pomegranate, grain, stew, meat, honey, milk, cheese, herbs, water, salt";
const OBJ_KEYS = "jar, lamp, scroll, coin, millstone, loom, plow, net, boat, tent, well, altar, sword, spear, shield, shofar, lyre, sandals, staff, sheep, donkey, camel, chariot, house, temple, bucket, tablet, ring, incense, basket, bow, crown, chains, tomb, tree";
const P_LOOK = ref => COMMON(ref) + `
The page draws simple figures and icons from a fixed kit, so choose only from the listed values for type, color and icon. Put the real historical detail in the label and text fields.
Shape:
{"figures":[{"name":"who this is, e.g. A Philistine soldier, or a named person from the passage","who":"1 sentence on their place in the passage",
"under":{"type":"tunic-knee|tunic-long|kilt|robe-fringed","color":"COLOR","label":"what this garment was, what it was made of and called"},
"over":{"type":"none|mantle|toga|cuirass|ephod|royal-robe|shawl","color":"COLOR","tassels":false,"label":"same, or empty if none"},
"head":{"type":"bare|headcloth|turban|veil|helmet|crown|nemes|cap","color":"COLOR","label":"hair or head covering"},
"beard":"none|short|full","hair":"dark|grey|white",
"hold":{"type":"none|staff|crook|spear|sword|jar|scroll|basket","label":"what they carry and why"},
"feet":{"type":"sandals|barefoot|boots","label":"footwear"},
"signals":"1 or 2 sentences on what this clothing told other people: rank, people-group, trade, religious law"}],
"foods":[{"icon":"KEY","name":"the food or drink","text":"1 sentence: how it was made or eaten, and where it touches this passage"}],
"objects":[{"icon":"KEY","name":"the object","text":"1 sentence, same idea"}]}
COLOR is one of: undyed, white-linen, brown, dark-brown, grey, black, red, blue, yellow, purple, green, scarlet. Use dyes that fit the person's rank; most ordinary people wore undyed wool.
Give 2 or 3 figures who differ from each other (for example a man and a woman, or ruler and commoner, or two peoples in the passage), dressed for this exact place and century. Use kilt and nemes only for Egyptians, toga and cuirass for Romans (cuirass for any armoured soldier), robe-fringed and cap for Mesopotamians and Persians, ephod for Israelite priests, tassels true for Israelite or Jewish men's mantles.
Give 5 or 6 foods; icon KEY is one of: ${FOOD_KEYS}.
Give 5 or 6 objects that appear in or explain this passage; icon KEY is one of: ${OBJ_KEYS}.
Choose the closest key and say what the thing really was in name and text.`;

export const PROMPTS = {setting:P_SETTING, scene:P_SCENE, look:P_LOOK, words:P_WORDS};
