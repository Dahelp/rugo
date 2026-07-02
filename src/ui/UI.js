export class UI {
    constructor(game) {
        this.game = game;
        this.screens = ['mainMenu', 'levelSelect', 'heroSelect', 'shop', 'pauseScreen', 'victoryScreen', 'defeatScreen'];
    }

    showScreen(name) {
        for (const s of this.screens) {
            const el = document.getElementById(s);
            if (el) el.classList.remove('active');
        }
        const target = document.getElementById(name);
        if (target) target.classList.add('active');
    }

    hideAllScreens() {
        for (const s of this.screens) {
            const el = document.getElementById(s);
            if (el) el.classList.remove('active');
        }
    }

    showHUD(show) {
        const hud = document.getElementById('hud');
        if (show) hud.classList.add('active');
        else hud.classList.remove('active');
    }

    showTouchControls(show) {
        const tc = document.getElementById('touchControls');
        if (tc) {
            if (show) tc.classList.add('active');
            else tc.classList.remove('active');
        }
    }

    updateCurrency(coins, gems) {
        const coinEl = document.getElementById('coinCount');
        const gemEl = document.getElementById('gemCount');
        if (coinEl) coinEl.textContent = coins.toLocaleString('ru');
        if (gemEl) gemEl.textContent = gems.toLocaleString('ru');
    }

    updateHealth(current, max) {
        const fill = document.getElementById('healthFill');
        const text = document.getElementById('healthText');
        const percent = Math.max(0, (current / max) * 100);
        if (fill) fill.style.width = percent + '%';
        if (text) text.textContent = `${Math.ceil(current)} / ${max}`;
    }

    updateSpecial(percent, label, ready) {
        const fill = document.getElementById('specialFill');
        const text = document.getElementById('specialLabel');
        if (fill) fill.style.width = percent + '%';
        if (text) text.textContent = ready ? `${label} [K]` : `${label}...`;
    }

    updateObjectives(objectives) {
        const panel = document.getElementById('objectivesList');
        if (!panel) return;
        panel.innerHTML = '';
        for (const obj of objectives) {
            const item = document.createElement('div');
            item.className = 'objective-item' + (obj.done ? ' done' : '');
            const icon = obj.done ? '✓' : '○';
            const total = obj.count ?? obj.target;
            item.innerHTML = `<span class="check">${icon}</span> ${obj.label} (${obj.current}/${total})`;
            panel.appendChild(item);
        }
    }

    showBossHealth(name, percent) {
        const container = document.getElementById('bossHealthContainer');
        const fill = document.getElementById('bossHealthFill');
        const nameEl = document.getElementById('bossName');
        if (container) container.classList.add('active');
        if (nameEl) nameEl.textContent = name;
        if (fill) fill.style.width = percent + '%';
    }

    updateBossHealth(percent) {
        const fill = document.getElementById('bossHealthFill');
        if (fill) fill.style.width = percent + '%';
    }

    hideBossHealth() {
        const container = document.getElementById('bossHealthContainer');
        if (container) container.classList.remove('active');
    }

    showNotification(text, duration = 2000) {
        const el = document.getElementById('notification');
        if (!el) return;
        el.textContent = text;
        el.classList.add('show');
        clearTimeout(this._notifTimer);
        this._notifTimer = setTimeout(() => el.classList.remove('show'), duration);
    }

    renderLevelSelect(saveData, levelsData) {
        const grid = document.getElementById('levelGrid');
        if (!grid) return;
        grid.innerHTML = '';

        levelsData.levels.forEach((level, index) => {
            const completed = saveData.levelsCompleted.includes(level.id);
            const prevCompleted = index === 0 || saveData.levelsCompleted.includes(levelsData.levels[index - 1].id);
            const locked = !prevCompleted && !completed;

            const card = document.createElement('div');
            card.className = 'level-card';
            if (locked) card.classList.add('locked');
            if (completed) card.classList.add('completed');

            const stars = '★'.repeat(level.difficulty) + '☆'.repeat(5 - level.difficulty);

            card.innerHTML = `
                <div class="level-number">${level.id}</div>
                <div class="level-name">${level.nameRu}</div>
                <div class="level-difficulty" style="color: #ffd700;">${stars}</div>
                ${locked ? '<div class="lock-icon">🔒</div>' : ''}
                ${completed ? '<div style="color: #2ecc71; font-size: 20px; margin-top: 8px;">✓</div>' : ''}
            `;

            if (!locked) {
                card.addEventListener('click', () => {
                    this.game.startLevel(level);
                });
            }

            grid.appendChild(card);
        });
    }

    renderHeroSelect(saveData, heroesData) {
        const grid = document.getElementById('heroSelectGrid');
        if (!grid) return;
        grid.innerHTML = '';

        heroesData.heroes.forEach(hero => {
            const owned = saveData.unlockedHeroes.includes(hero.id);
            const selected = saveData.selectedHero === hero.id;

            const card = document.createElement('div');
            card.className = 'hero-card';
            if (!owned) card.classList.add('locked');
            if (selected) card.classList.add('selected');

            const maxHP = 200, maxATK = 50, maxSPD = 8, maxDEF = 50;
            const statBar = (label, val, max, color) => `
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="width:30px; font-size:10px; color:#8aa5c4;">${label}</span>
                    <div class="stat-bar" style="flex:1;">
                        <div class="stat-fill" style="width:${(val/max)*100}%; background:${color};"></div>
                    </div>
                </div>`;

            const icon = this._getHeroIcon(hero.id);

            card.innerHTML = `
                <div class="hero-preview" style="border-color: ${hero.colors.torso}; background: ${hero.colors.torso}33;">
                    ${icon}
                </div>
                <div class="hero-name">${hero.name}</div>
                <div class="hero-role">${hero.role}</div>
                <div style="margin-top: 8px;">
                    ${statBar('HP', hero.stats.health, maxHP, '#e74c3c')}
                    ${statBar('ATK', hero.stats.attack, maxATK, '#f39c12')}
                    ${statBar('SPD', hero.stats.speed, maxSPD, '#3498db')}
                    ${statBar('DEF', hero.stats.defense, maxDEF, '#27ae60')}
                </div>
                <div style="margin-top: 8px; font-size: 11px; color: #bb8fce;">
                    ✦ ${hero.special.label}: ${hero.special.description}
                </div>
                ${owned ? (selected ? '<div class="price-tag owned">Выбран</div>' : '<div class="price-tag owned">Нажмите, чтобы выбрать</div>')
                        : `<div class="price-tag ${hero.price.type === 'gems' ? 'gems' : 'coins'}">${hero.price.type === 'gems' ? '💎' : '🪙'} ${hero.price.amount}</div>`}
            `;

            if (owned) {
                card.addEventListener('click', () => {
                    this.game.selectHero(hero.id);
                    this.renderHeroSelect(this.game.saveData, heroesData);
                });
            } else {
                card.addEventListener('click', () => {
                    this.game.tryBuyHero(hero);
                });
            }

            grid.appendChild(card);
        });
    }

    renderShop(saveData, heroesData) {
        const grid = document.getElementById('shopGrid');
        if (!grid) return;
        grid.innerHTML = '';

        heroesData.heroes.forEach(hero => {
            const owned = saveData.unlockedHeroes.includes(hero.id);

            const card = document.createElement('div');
            card.className = 'hero-card';
            if (!owned) card.classList.add('locked');

            const icon = this._getHeroIcon(hero.id);
            const statBar = (label, val, max, color) => `
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="width:30px; font-size:10px; color:#8aa5c4;">${label}</span>
                    <div class="stat-bar" style="flex:1;">
                        <div class="stat-fill" style="width:${(val/max)*100}%; background:${color};"></div>
                    </div>
                </div>`;

            card.innerHTML = `
                <div class="hero-preview" style="border-color: ${hero.colors.torso}; background: ${hero.colors.torso}33;">
                    ${icon}
                </div>
                <div class="hero-name">${hero.name}</div>
                <div class="hero-role">${hero.role}</div>
                <div style="font-size: 12px; color: #aab7c4; margin-top: 4px;">${hero.description}</div>
                <div style="margin-top: 8px;">
                    ${statBar('HP', hero.stats.health, 200, '#e74c3c')}
                    ${statBar('ATK', hero.stats.attack, 50, '#f39c12')}
                    ${statBar('SPD', hero.stats.speed, 8, '#3498db')}
                    ${statBar('DEF', hero.stats.defense, 50, '#27ae60')}
                </div>
                <div style="margin-top: 6px; font-size: 11px; color: #bb8fce;">
                    ✦ ${hero.special.label}
                </div>
                ${owned ? '<div class="price-tag owned">✓ Куплен</div>'
                        : `<div class="price-tag ${hero.price.type === 'gems' ? 'gems' : 'coins'}">${hero.price.type === 'gems' ? '💎' : '🪙'} ${hero.price.amount.toLocaleString('ru')}</div>`}
            `;

            if (!owned) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    this.game.tryBuyHero(hero);
                });
            }

            grid.appendChild(card);
        });
    }

    showVictory(rewards) {
        document.getElementById('victoryTitle').textContent = 'ПОБЕДА!';
        document.getElementById('victoryRewards').innerHTML = `
            <div class="reward-item">🪙 +${rewards.coins}</div>
            <div class="reward-item">💎 +${rewards.gems}</div>
        `;
        this.showScreen('victoryScreen');
    }

    showDefeat() {
        this.showScreen('defeatScreen');
    }

    _getHeroIcon(id) {
        const icons = {
            rugo: '⚔️', blaze: '🔥', goliath: '🔨',
            spark: '✨', shadow: '🥷', titan: '🛡️'
        };
        return icons[id] || '🧱';
    }
}
