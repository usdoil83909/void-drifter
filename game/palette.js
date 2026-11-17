// Text colors are checked against the opaque panel surface at boot.
// Decorative glows deliberately do not participate in text contrast checks.
const VD = window.VD = window.VD || {};

const colors = Object.freeze({
  space: '#0b1020',
  panel: '#101c30',
  ink: '#edf5ff',
  muted: '#a9bad0',
  cyan: '#22d3ee',
  amber: '#fbbf24',
  pink: '#f472b6',
  green: '#4ade80',
  violet: '#c4b5fd',
  danger: '#fb7185',
  rock: '#e879f9',
  line: '#405471'
});

function luminance(hex) {
  const channels = [1, 3, 5].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const textRoles = ['ink', 'muted', 'cyan', 'amber', 'pink', 'green', 'violet', 'danger'];
const report = textRoles.map(role => ({
  role,
  color: colors[role],
  ratio: contrast(colors[role], colors.panel)
}));

VD.Palette = {
  ...colors,
  contrast,
  report,
  readable: report.every(result => result.ratio >= 4.5)
};
