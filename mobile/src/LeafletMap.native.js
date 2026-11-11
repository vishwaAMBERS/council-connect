// Interactive campus map for phones: a Leaflet page inside a WebView (OpenStreetMap tiles).
import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from './ui';

/** A self-contained Leaflet page with the places baked in as JSON. Text is set with textContent, never as HTML. */
function leafletPage(places) {
  const data = JSON.stringify(places).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var places = ${data};
  var map = L.map('map').setView([19.8750, 75.3438], 17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  places.forEach(function (p) {
    var marker = L.circleMarker([p.lat, p.lng], { radius: p.busy ? 11 : 8, color: '#fff', weight: 3, fillColor: p.color, fillOpacity: 1 }).addTo(map);
    var box = document.createElement('div');
    var name = document.createElement('strong'); name.textContent = p.name; box.appendChild(name);
    p.lines.forEach(function (line) { var row = document.createElement('div'); row.textContent = line; box.appendChild(row); });
    marker.bindPopup(box);
  });
</script></body></html>`;
}

/** `places` is [{ name, lat, lng, color, lines, busy }]. */
export default function LeafletMap({ places }) {
  if (places.length === 0) return null;
  return (
    <View style={{ height: 320, borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: colors.border }}>
      <WebView originWhitelist={['*']} source={{ html: leafletPage(places) }} key={places.map((p) => p.name).join('|')} />
    </View>
  );
}
