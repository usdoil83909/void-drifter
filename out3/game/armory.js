const VD = window.VD = window.VD || {};

// These formulas mirror the values used by Player.shoot and Player.update.
// Cards expose practical quantities rather than a generic upgrade percentage.
const weapons = [
  {
    name: 'Pulse',
    color: '#22d3ee',
    role: 'Reliable interceptor',
    description: 'Fast, precise bolts. A dependable answer to hunters and loose fragments.',
    tactic: 'Lead moving targets. Short bursts keep your escape route clear.',
    stats(tier) {
      return [
        ['Bolt damage', 1 + (tier - 1) * 0.5, ''],
        ['Shots / second', 1 / (0.17 - tier * 0.02), ''],
        ['Projectile speed', 680, 'u/s']
      ];
    }
  },
  {
    name: 'Scatter',
    color: '#fbbf24',
    role: 'Close-range crowd control',
    description: 'A widening fan of amber pellets. More effective when several pellets connect.',
    tactic: 'Approach a Bulwark during recovery, unload, then thrust away.',
    stats(tier) {
      return [
        ['Pellets / volley', tier * 2 + 3, ''],
        ['Full volley damage', (tier * 2 + 3) * 0.8, ''],
        ['Cooldown', 0.46 - tier * 0.035, 's']
      ];
    }
  },
  {
    name: 'Lance',
    color: '#67e8f9',
    role: 'Piercing precision',
    description: 'A bright, high-speed beam that continues through several targets.',
    tactic: 'Line up fragments and escorts to turn one shot into a combo chain.',
    stats(tier) {
      return [
        ['Beam damage', 1.5 + tier * 0.5, ''],
        ['Targets / beam', 4 + tier, ''],
        ['Cooldown', 0.48 - tier * 0.05, 's']
      ];
    }
  },
  {
    name: 'Homing Swarm',
    color: '#4ade80',
    role: 'Mobile pursuit',
    description: 'Seeking missiles curve toward hostile ships while you concentrate on flying.',
    tactic: 'Keep moving across the arena. Missiles need room to turn.',
    stats(tier) {
      return [
        ['Missiles / volley', tier + 2, ''],
        ['Full volley damage', (tier + 2) * 1.3, ''],
        ['Cooldown', 0.65 - tier * 0.05, 's']
      ];
    }
  },
  {
    name: 'Railgun',
    color: '#f0abfc',
    role: 'Charged execution',
    description: 'Hold fire to charge, release to deliver a piercing impact. Full charge takes 1.2 seconds.',
    tactic: 'Charge while dodging. Release through the Sentinel’s rotating gap.',
    stats(tier) {
      return [
        ['Full charge damage', 3 + tier * 2, ''],
        ['Targets / round', 11, ''],
        ['Projectile speed', 1900, 'u/s']
      ];
    }
  }
];

const systems = [
  {
    name: 'Hull plating',
    field: 'plating',
    color: '#22d3ee',
    role: 'Survivability',
    description: 'Reinforced hull segments increase capacity and repair 25 hull immediately.',
    stats(tier) {
      return [
        ['Maximum hull', 100 + tier * 25, ''],
        ['Repair on purchase', 25, 'HP']
      ];
    }
  },
  {
    name: 'Engine tuning',
    field: 'engine',
    color: '#fbbf24',
    role: 'Mobility',
    description: 'Higher acceleration and top speed help escape closing crossfire.',
    stats(tier) {
      return [
        ['Maximum speed', 360 + tier * 45, 'u/s'],
        ['Thrust', 880 + tier * 150, 'u/s²']
      ];
    }
  },
  {
    name: 'Magnet',
    field: 'magnet',
    color: '#4ade80',
    role: 'Salvage recovery',
    description: 'A wider attraction field gathers credits, repair cells, and shield cells.',
    stats(tier) {
      return [
        ['Attraction radius', 190 + tier * 85, 'u'],
        ['Salvage value', 8, 'CR']
      ];
    }
  },
  {
    name: 'Shield recharger',
    field: 'recharger',
    color: '#c4b5fd',
    role: 'Defensive recovery',
    description: 'Restores shield energy more quickly whenever the shield is released.',
    stats(tier) {
      return [
        ['Recharge / second', 16 + tier * 9, ''],
        ['Empty to full', 100 / (16 + tier * 9), 's']
      ];
    }
  }
];

function format(value) {
  if (Number.isInteger(value)) return String(value);
  if (value < 1) return value.toFixed(3).replace(/0+$/, '');
  return value.toFixed(1).replace(/\.0$/, '');
}

function get(page, index) {
  return (page ? systems : weapons)[index];
}

function tier(g, page, index) {
  return page ? g.player[systems[index].field] : g.player.tiers[index];
}

function basePrice(page, index, owned) {
  return page ? 65 + owned * 70 : 60 + index * 12 + owned * 65;
}

function pips(owned) {
  let html = '<span class="tier-pips" aria-label="Tier ' + owned + ' of 3">';
  for (let i = 0; i < 3; i++) {
    html += '<i class="' + (i < owned ? 'filled' : '') + '"></i>';
  }
  return html + '</span>';
}

function comparison(page, index, owned) {
  const item = get(page, index);
  const current = item.stats(Math.max(page ? 0 : 1, owned));
  const next = item.stats(Math.min(3, owned + 1));
  let html = '<table class="comparison"><thead><tr><th scope="col">STAT</th>';
  html += '<th scope="col">CURRENT</th><th scope="col">' + (owned === 3 ? 'MAX' : 'NEXT') + '</th>';
  html += '</tr></thead><tbody>';
  current.forEach((row, index) => {
    const locked = !page && owned === 0;
    const changed = locked || row[1] !== next[index][1];
    html += '<tr><th scope="row">' + row[0] + '</th>';
    html += '<td>' + (locked ? '—' : format(row[1]) + ' ' + row[2]) + '</td>';
    html += '<td class="' + (changed ? 'improved' : '') + '">' +
      format(next[index][1]) + ' ' + next[index][2] + '</td></tr>';
  });
  return html + '</tbody></table>';
}

function weaponGuide() {
  let html = '<div class="weapon-guide">';
  weapons.forEach((weapon, index) => {
    html += '<article style="--item-color:' + weapon.color + '">';
    html += '<h3>' + (index + 1) + ' / ' + weapon.name + '</h3>';
    html += '<p class="eyebrow">' + weapon.role + '</p>';
    html += '<p>' + weapon.description + '</p>';
    html += '<p class="tactic">' + weapon.tactic + '</p></article>';
  });
  return html + '</div>';
}

VD.Armory = {
  weapons,
  systems,
  get,
  tier,
  basePrice,
  pips,
  comparison,
  weaponGuide,
  format
};
