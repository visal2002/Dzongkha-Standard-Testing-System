# Internal name transliteration
POST /api/v1/certificates/names/transliterate
Authenticated; requires certificate.view_own, certificate.manage or certificate.issue (admin wildcard works).
Request: { "englishName": "Wangchuk Dema" }
Response uses the standard data envelope: englishName, dzongkhaName, method (dictionary/phonetic/provided), isVerified=false, requiresReview, approximateParts.
Names are processed locally; no external API, API key, logs of the names or new database writes. Rate limiting uses the existing gateway certificate route.
Certificate rendering prefers an existing saved Dzongkha name. Otherwise it invokes the same local function automatically; English name is unchanged. It does not overwrite profiles or certified identity records.
Dictionary spellings are developer-maintained suggestions, not DCRC-verified names. Unknown words use a limited phonetic heuristic, not a general language translation model. English spelling is ambiguous and generated Dzongkha may be wrong. Users can correct the spelling via their profile. Linguistic review is recommended before official use.
