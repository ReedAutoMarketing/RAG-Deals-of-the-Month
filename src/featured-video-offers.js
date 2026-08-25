/**
 * Featured Video Offers — hosted widget.
 *
 * Reads a published Google Sheet CSV and renders two sections inside the
 * target container: a vertical YouTube Shorts rail and a landscape 16:9 grid.
 *
 * Pair with prod-video-marketing.css, which supplies every class used here.
 *
 * Configure per rooftop on the script tag:
 *   <script defer data-ca-video-offers
 *           data-sheet-url="https://docs.google.com/.../pub?gid=...&single=true&output=csv"
 *           data-container="videos-container"
 *           data-header-rows="5"
 *           src=".../featured-video-offers.js"></script>
 */
(function () {
    'use strict';

    var SHEET_URL_DEFAULT =
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjcfknXWqSF0jAiiOgTe7GW_uoGo74U7mpx_YIiGxMU7lPkCC6hTw_GaXKbOVaiJhSIkEuPJA-i0Lo/pub?gid=1250616523&single=true&output=csv';
    var CONTAINER_ID_DEFAULT = 'videos-container';
    var HEADER_ROWS_DEFAULT = 5;
    var INIT_FLAG = 'data-ca-video-offers-init';

    // Read at top level: document.currentScript is null inside later callbacks.
    var scriptEl = document.currentScript || document.querySelector('script[data-ca-video-offers]');

    function readConfig() {
        var sheetUrl = SHEET_URL_DEFAULT;
        var containerId = CONTAINER_ID_DEFAULT;
        var headerRows = HEADER_ROWS_DEFAULT;

        if (scriptEl) {
            sheetUrl = (scriptEl.getAttribute('data-sheet-url') || '').trim() || sheetUrl;
            containerId = (scriptEl.getAttribute('data-container') || '').trim() || containerId;

            var rows = parseInt(scriptEl.getAttribute('data-header-rows'), 10);
            if (!isNaN(rows) && rows >= 0) headerRows = rows;
        }

        return { sheetUrl: sheetUrl, containerId: containerId, headerRows: headerRows };
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Returns an http(s) URL or '' — blocks javascript:/data: from the sheet. */
    function safeHttpUrl(value) {
        var raw = String(value || '').trim();
        if (!raw) return '';

        try {
            var parsed = new URL(raw, window.location.href);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.href;
            }
        } catch (err) {
            return '';
        }

        return '';
    }

    function isYouTubeId(value) {
        return typeof value === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(value);
    }

    /** Handles watch?v=, youtu.be/, embed/, shorts/, live/, v/, and bare ids. */
    function extractYouTubeId(url) {
        if (!url) return null;

        var trimmed = String(url).trim();
        if (isYouTubeId(trimmed)) return trimmed;

        try {
            var parsed = new URL(trimmed);
            var host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

            if (host === 'youtu.be') {
                var shortId = parsed.pathname.split('/').filter(Boolean)[0];
                return isYouTubeId(shortId) ? shortId : null;
            }

            if (
                host === 'youtube.com' ||
                host === 'youtube-nocookie.com' ||
                host.indexOf('.youtube.com') !== -1
            ) {
                var fromQuery = parsed.searchParams.get('v');
                if (isYouTubeId(fromQuery)) return fromQuery;

                var parts = parsed.pathname.split('/').filter(Boolean);
                for (var i = 0; i < parts.length; i++) {
                    var kind = parts[i].toLowerCase();
                    if (kind === 'shorts' || kind === 'embed' || kind === 'live' || kind === 'v') {
                        if (isYouTubeId(parts[i + 1])) return parts[i + 1];
                    }
                }
            }
        } catch (err) {
            // Fall through to the regex pass for malformed strings.
        }

        var patterns = [
            /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/,
        ];

        for (var p = 0; p < patterns.length; p++) {
            var match = trimmed.match(patterns[p]);
            if (match && isYouTubeId(match[1])) return match[1];
        }

        return null;
    }

    function isYouTubeShortUrl(url) {
        return /(?:youtube\.com|youtu\.be)\/shorts\//i.test(String(url || ''));
    }

    function parseCSV(csvText) {
        var rows = [];
        var currentRow = [];
        var currentField = '';
        var insideQuotes = false;

        for (var i = 0; i < csvText.length; i++) {
            var char = csvText[i];
            var nextChar = csvText[i + 1];

            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !insideQuotes) {
                if (char === '\r' && nextChar === '\n') i++;
                if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                }
            } else {
                currentField += char;
            }
        }

        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }

        return rows;
    }

    var players = {};

    function registerPlayer(iframeId, overlayId) {
        var iframe = document.getElementById(iframeId);
        var overlay = document.getElementById(overlayId);
        if (!iframe || !overlay) return;

        players[iframeId] = { iframe: iframe, overlay: overlay };

        overlay.addEventListener('click', function () {
            play(iframeId);
        });
    }

    function play(iframeId) {
        var player = players[iframeId];
        if (!player) return;

        player.overlay.style.opacity = '0';
        player.overlay.style.pointerEvents = 'none';

        if (player.iframe.contentWindow) {
            player.iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                '*',
            );
        }
    }

    function buildVideoCard(video) {
        var containerClass = video.isShort
            ? 'ca-video-container ca-video-container--short'
            : 'ca-video-container';
        var cardClass = video.isShort ? 'ca-video-card ca-video-card--short' : 'ca-video-card';
        var badgeClass = video.isShort ? 'ca-video-badge ca-video-badge--short' : 'ca-video-badge';
        var badgeLabel = video.isShort ? 'Short' : 'Video';

        var offerHtml = video.offer
            ? '<p class="ca-video-offer">' + escapeHtml(video.offer) + '</p>'
            : '';
        var descHtml = video.description
            ? '<p class="ca-video-desc">' + escapeHtml(video.description) + '</p>'
            : '';
        var ctaHtml = video.vrpLink
            ? '<a href="' +
              escapeHtml(video.vrpLink) +
              '" target="_blank" ' +
              'rel="noopener noreferrer" class="ca-explore-offer">Explore Offer</a>'
            : '';

        var wrapper = document.createElement('div');
        wrapper.className = 'ca-video-wrapper';
        wrapper.innerHTML =
            '<div class="' +
            cardClass +
            '">' +
            '<div class="ca-video-media">' +
            '<div class="' +
            containerClass +
            '">' +
            '<iframe id="' +
            video.iframeId +
            '"' +
            ' src="https://www.youtube.com/embed/' +
            video.videoId +
            '?enablejsapi=1&controls=1&rel=0&modestbranding=1&playsinline=1"' +
            ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"' +
            ' allowfullscreen></iframe>' +
            '<div class="ca-video-overlay ca-cursor-pointer" id="' +
            video.overlayId +
            '">' +
            '<div class="ca-play-icon">' +
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<path d="M8 5v14l11-7z"></path>' +
            '</svg>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<span class="' +
            badgeClass +
            '">' +
            badgeLabel +
            '</span>' +
            '</div>' +
            '<div class="ca-video-aside">' +
            '<div class="ca-video-copy">' +
            '<h3>' +
            escapeHtml(video.title) +
            '</h3>' +
            offerHtml +
            descHtml +
            '</div>' +
            ctaHtml +
            '</div>' +
            '</div>';

        return wrapper;
    }

    function buildSection(railClass, label, trackClass, videos) {
        var section = document.createElement('section');
        section.className = railClass;

        if (label) {
            var heading = document.createElement('p');
            heading.className = 'ca-section-label';
            heading.textContent = label;
            section.appendChild(heading);
        }

        var track = document.createElement('div');
        track.className = trackClass;
        videos.forEach(function (video) {
            track.appendChild(buildVideoCard(video));
        });

        section.appendChild(track);
        return section;
    }

    function collectVideos(rows, headerRows) {
        var published = [];
        var uid = 'cavo-' + Math.random().toString(36).slice(2, 8);

        rows.slice(headerRows).forEach(function (row, index) {
            if (!row || row.length < 6 || !row.join('').trim()) return;

            var publishValue = row[3] ? row[3].toLowerCase().trim() : '';
            if (publishValue !== 'true') return;

            var youtubeUrl = (row[4] || '').trim();
            var videoId = extractYouTubeId(youtubeUrl);
            if (!videoId) {
                console.warn('[video-offers] Unrecognized YouTube URL:', youtubeUrl);
                return;
            }

            published.push({
                title: (row[0] || '').trim(),
                offer: (row[1] || '').trim(),
                description: (row[2] || '').trim(),
                vrpLink: safeHttpUrl(row[5]),
                videoId: videoId,
                isShort: isYouTubeShortUrl(youtubeUrl),
                iframeId: uid + '-iframe-' + index,
                overlayId: uid + '-overlay-' + index,
            });
        });

        return published;
    }

    function render(container, published) {
        var shorts = published.filter(function (video) {
            return video.isShort;
        });
        var landscape = published.filter(function (video) {
            return !video.isShort;
        });

        if (shorts.length) {
            container.appendChild(
                buildSection(
                    'ca-shorts-rail',
                    'Shorts',
                    shorts.length === 1
                        ? 'ca-shorts-track ca-shorts-track--single'
                        : 'ca-shorts-track',
                    shorts,
                ),
            );
        }

        if (landscape.length) {
            container.appendChild(
                buildSection(
                    'ca-landscape-rail',
                    shorts.length ? 'Video offers' : '',
                    'ca-landscape-grid',
                    landscape,
                ),
            );
        }

        published.forEach(function (video) {
            registerPlayer(video.iframeId, video.overlayId);
        });
    }

    /** GTM's YouTube trigger needs the IFrame API present. */
    function loadYouTubeApi() {
        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;

        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        (document.head || document.documentElement).appendChild(tag);
    }

    function init() {
        var config = readConfig();
        var container = document.getElementById(config.containerId);

        if (!container) {
            console.warn('[video-offers] Container #' + config.containerId + ' not found.');
            return;
        }

        if (container.getAttribute(INIT_FLAG) === 'true') return;
        container.setAttribute(INIT_FLAG, 'true');

        loadYouTubeApi();

        fetch(config.sheetUrl)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Sheet request failed: ' + response.status);
                }
                return response.text();
            })
            .then(function (csvText) {
                render(container, collectVideos(parseCSV(csvText), config.headerRows));
            })
            .catch(function (error) {
                console.error('[video-offers] Unable to load videos:', error);
            });
    }

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    onReady(init);
})();
