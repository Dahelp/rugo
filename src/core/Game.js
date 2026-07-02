import * as THREE from 'three';
import { Input } from './Input.js';
import { SaveSystem } from './SaveSystem.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Level } from '../world/Level.js';
import { UI } from '../ui/UI.js';

export class Game {
    constructor() {
        this.saveData = SaveSystem.load();
        this.heroesData = null;
        this.levelsData = null;
        this.bossesData = null;

        this.state = 'menu';
        this.ui = new UI(this);
        this.input = new Input();

        this._initRenderer();
        this._initScene();

        this.player = null;
        this.enemies = [];
        this.boss = null;
        this.level = null;
        this.effects = [];
        this.enemyProjectiles = [];

        this.objectives = [];
        this.enemiesKilled = 0;
        this.bossArenaTriggered = false;
        this.coinPickupCount = 0;

        this.cameraTarget = new THREE.Vector3();
        this.clock = new THREE.Clock();
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTime = 0;

        this.slowEffect = 0;

        window.addEventListener('resize', () => this._onResize());
    }

    async loadData() {
        const fetchConfig = async (path) => {
            const resp = await fetch(path);
            return resp.json();
        };

        this.heroesData = await fetchConfig('configs/heroes.json');
        this.levelsData = await fetchConfig('configs/levels.json');
        this.bossesData = await fetchConfig('configs/bosses.json');
    }

    _initRenderer() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    _initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 300
        );
        this.camera.position.set(0, 10, 15);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.ui.showScreen('mainMenu');
        this.ui.updateCurrency(this.saveData.coins, this.saveData.gems);
        this._animate();
    }

    selectHero(heroId) {
        this.saveData.selectedHero = heroId;
        SaveSystem.save(this.saveData);
    }

    tryBuyHero(hero) {
        const price = hero.price;
        if (price.type === 'coins' && this.saveData.coins >= price.amount) {
            this.saveData.coins -= price.amount;
            this.saveData.unlockedHeroes.push(hero.id);
            SaveSystem.save(this.saveData);
            this.ui.updateCurrency(this.saveData.coins, this.saveData.gems);
            this.ui.showNotification(`${hero.name} куплен!`, 2000);
            this._refreshCurrentScreen();
        } else if (price.type === 'gems' && this.saveData.gems >= price.amount) {
            this.saveData.gems -= price.amount;
            this.saveData.unlockedHeroes.push(hero.id);
            SaveSystem.save(this.saveData);
            this.ui.updateCurrency(this.saveData.coins, this.saveData.gems);
            this.ui.showNotification(`${hero.name} куплен!`, 2000);
            this._refreshCurrentScreen();
        } else {
            const need = price.type === 'coins' ? 'монет' : 'кристаллов';
            this.ui.showNotification(`Недостаточно ${need}!`, 2000);
        }
    }

    _refreshCurrentScreen() {
        const active = document.querySelector('.screen.active');
        if (!active) return;
        if (active.id === 'shop') this.ui.renderShop(this.saveData, this.heroesData);
        if (active.id === 'heroSelect') this.ui.renderHeroSelect(this.saveData, this.heroesData);
    }

    startLevel(levelData) {
        this._clearScene();
        this.currentLevelData = levelData;

        this.level = new Level(this.scene, levelData);
        this.level.build();

        const heroData = this.heroesData.heroes.find(h => h.id === this.saveData.selectedHero);
        this.player = new Player(this.scene, heroData);

        const spawnPlatform = levelData.platforms[0];
        this.player.mesh.position.set(0, spawnPlatform.size[1] / 2 + 0.5, 5);

        this.enemies = [];
        for (const es of levelData.enemySpawns || []) {
            const enemy = new Enemy(this.scene, es.type, new THREE.Vector3(...es.pos));
            this.enemies.push(enemy);
        }

        this._setupObjectives(levelData);
        this.bossArenaTriggered = false;
        this.boss = null;
        this.coinPickupCount = 0;
        this.enemyProjectiles = [];

        this.state = 'playing';
        this.ui.hideAllScreens();
        this.ui.showHUD(true);
        this.ui.showTouchControls(this.input.isTouch());
        this.ui.updateCurrency(this.saveData.coins, this.saveData.gems);
        this.ui.hideBossHealth();
        this.ui.showNotification(`Уровень ${levelData.id}: ${levelData.nameRu}`, 3000);
    }

    _setupObjectives(levelData) {
        this.objectives = levelData.objectives.map(o => ({
            type: o.type,
            target: o.target,
            count: o.count,
            label: o.label,
            current: 0,
            done: false
        }));
        this.enemiesKilled = 0;
    }

    _spawnBoss() {
        const bossData = this.bossesData.bosses.find(b => b.id === this.currentLevelData.bossId);
        if (!bossData) return;

        this.boss = new Boss(this.scene, bossData);
        const arenaPos = this.level.bossArenaCenter;
        this.boss.setPosition(new THREE.Vector3(arenaPos.x, arenaPos.y + 0.5, arenaPos.z + 8));
        this.boss.facingAngle = Math.PI;

        this.ui.showBossHealth(bossData.nameRu, 100);
        this.ui.showNotification(`⚠ БОСС: ${bossData.nameRu}!`, 3000);
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);

        this.frameCount++;
        this.fpsTime += dt;
        if (this.fpsTime >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTime = 0;
        }

        if (this.state === 'playing') {
            this._updateGame(dt);
        }

        this._updateEffects(dt);
        this._updateCamera(dt);
        this.renderer.render(this.scene, this.camera);
    }

    _updateGame(dt) {
        const slowMul = this.slowEffect > 0 ? 0.5 : 1;
        if (this.slowEffect > 0) this.slowEffect -= dt;
        const adjDt = dt * slowMul;

        if (this.player && !this.player.dead) {
            this.player.update(adjDt, this.input, this.input.cameraAngleY, this.level.platforms, this.enemies, this.boss, this);
            this.player.updateProjectiles(adjDt, this.enemies, this.boss, this);
        }

        if (this.level) this.level.update(dt, this.player ? this.player.getPosition() : new THREE.Vector3());

        if (this.player) {
            this._checkPickups();
        }

        for (const enemy of this.enemies) {
            if (!enemy.dead) {
                enemy.update(adjDt, this.player.getPosition(), this);
            }
        }

        if (this.boss && !this.boss.dead) {
            this.boss.update(adjDt, this.player.getPosition(), this);
            this.ui.updateBossHealth(this.boss.getHealthPercent());
        }

        this._updateEnemyProjectiles(adjDt);

        this._updateObjectives();

        this._checkGameStates();

        if (this.player) {
            this.ui.updateHealth(this.player.health, this.player.maxHealth);
            const specialReady = this.player.specialCooldown <= 0;
            this.ui.updateSpecial(
                this.player.getSpecialCooldownPercent(),
                this.player.heroData.special.label,
                specialReady
            );
        }
    }

    _checkPickups() {
        const pos = this.player.getPosition();
        const collectedCrystals = this.level.checkCrystalPickup(pos);
        for (const c of collectedCrystals) {
            this.spawnPickupEffect(c.pos.clone(), 0x00ffaa);
            this._onCrystalCollected();
        }

        const coinsGained = this.level.checkCoinPickup(pos);
        if (coinsGained > 0) {
            this.coinPickupCount += coinsGained * 10;
            this.saveData.coins += coinsGained * 10;
            this.ui.updateCurrency(this.saveData.coins, this.saveData.gems);
            SaveSystem.save(this.saveData);
            this.spawnPickupEffect(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd700);
        }
    }

    _onCrystalCollected() {
        const obj = this.objectives.find(o => o.type === 'collect');
        if (obj && !obj.done) {
            obj.current++;
            if (obj.current >= obj.count) obj.done = true;
        }
        this.saveData.coins += 50;
        this.ui.updateCurrency(this.saveData.coins, this.saveData.gems);
        SaveSystem.save(this.saveData);
    }

    _updateObjectives() {
        const defeatObj = this.objectives.find(o => o.type === 'defeat');
        if (defeatObj && !defeatObj.done) {
            defeatObj.current = this.enemiesKilled;
            if (defeatObj.current >= defeatObj.count) defeatObj.done = true;
        }

        const reachObj = this.objectives.find(o => o.type === 'reach');
        if (reachObj && !reachObj.done && this.player && this.level) {
            if (this.level.isInBossArena(this.player.getPosition())) {
                reachObj.current = 1;
                reachObj.done = true;
            }
        }

        this.ui.updateObjectives(this.objectives);
    }

    _checkGameStates() {
        if (!this.player) return;

        if (this.player.dead) {
            this.saveData.stats.deaths++;
            SaveSystem.save(this.saveData);
            this._onDefeat();
            return;
        }

        const allDone = this.objectives.every(o => o.done) ||
            this.objectives.filter(o => o.type !== 'reach').every(o => o.done);

        if (allDone && !this.bossArenaTriggered && this.player) {
            const reachObj = this.objectives.find(o => o.type === 'reach');
            if (!reachObj || reachObj.done) {
                this.bossArenaTriggered = true;
                this._spawnBoss();
            }
        }

        if (this.boss && this.boss.dead) {
            this._onBossDefeated();
        }
    }

    _onBossDefeated() {
        const rewards = this.currentLevelData.rewards;
        this.saveData.coins += rewards.coins;
        this.saveData.gems += rewards.gems || 0;
        if (!this.saveData.levelsCompleted.includes(this.currentLevelData.id)) {
            this.saveData.levelsCompleted.push(this.currentLevelData.id);
        }
        this.saveData.stats.bossKills++;
        SaveSystem.save(this.saveData);

        this.state = 'victory';
        this.ui.showHUD(false);
        this.ui.showTouchControls(false);
        this.ui.hideBossHealth();
        this.ui.showVictory(rewards);
    }

    _onDefeat() {
        this.state = 'defeat';
        this.ui.showHUD(false);
        this.ui.showTouchControls(false);
        this.ui.hideBossHealth();
        this.ui.showDefeat();
    }

    retryLevel() {
        this.startLevel(this.currentLevelData);
    }

    pauseGame() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        this.ui.showScreen('pauseScreen');
        this.ui.showTouchControls(false);
    }

    resumeGame() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        this.ui.hideAllScreens();
        this.ui.showTouchControls(this.input.isTouch());
    }

    togglePause() {
        if (this.state === 'playing') this.pauseGame();
        else if (this.state === 'paused') this.resumeGame();
    }

    backToMenu() {
        this._clearScene();
        this.state = 'menu';
        this.ui.showHUD(false);
        this.ui.showTouchControls(false);
        this.ui.hideBossHealth();
        this.ui.updateCurrency(this.saveData.coins, this.saveData.gems);
        this.ui.showScreen('mainMenu');
    }

    showLevelSelect() {
        this.ui.renderLevelSelect(this.saveData, this.levelsData);
        this.ui.showScreen('levelSelect');
    }

    showHeroSelect() {
        this.ui.renderHeroSelect(this.saveData, this.heroesData);
        this.ui.showScreen('heroSelect');
    }

    showShop() {
        this.ui.renderShop(this.saveData, this.heroesData);
        this.ui.showScreen('shop');
    }

    onEnemyKilled(enemy) {
        this.enemiesKilled++;
        this.saveData.stats.totalKills++;
        this.saveData.coins += 10;
        this.ui.updateCurrency(this.saveData.coins, this.saveData.gems);
        SaveSystem.save(this.saveData);
        this.spawnDeathEffect(enemy.getPosition());
    }

    onBossKilled(boss) {
        this.spawnDeathEffect(boss.getPosition(), 3);
    }

    onHitLanded() {
    }

    onSpecialUsed(special) {
        this.ui.showNotification(`✦ ${special.label}!`, 1500);
    }

    onBossAttack(attack) {
    }

    onPlayerSlowed(duration) {
        this.slowEffect = duration;
        this.ui.showNotification('❄ Замедление!', 1500);
    }

    spawnShockwave(pos, radius) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 1, 32),
            new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            })
        );
        ring.position.copy(pos);
        ring.position.y += 0.3;
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.effects.push({
            mesh: ring,
            life: 0.6,
            maxLife: 0.6,
            type: 'shockwave',
            startRadius: 0.5,
            endRadius: radius
        });
    }

    spawnFireCone(pos, dir, range) {
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(range * 0.5, range, 16, 1, true),
            new THREE.MeshBasicMaterial({
                color: 0xff4500,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            })
        );
        cone.position.copy(pos);
        cone.position.add(dir.clone().multiplyScalar(range / 2));
        cone.position.y += 1;
        cone.rotation.x = Math.PI / 2;
        cone.lookAt(pos.clone().add(dir.clone().multiplyScalar(range)));
        cone.rotateX(Math.PI / 2);
        this.scene.add(cone);
        this.effects.push({
            mesh: cone,
            life: 0.5,
            maxLife: 0.5,
            type: 'fire'
        });
    }

    spawnEnemyProjectile(pos, dir, damage, color) {
        const proj = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 1.5
            })
        );
        proj.position.copy(pos);
        this.scene.add(proj);

        const light = new THREE.PointLight(color, 1, 8);
        light.position.copy(pos);
        this.scene.add(light);

        this.enemyProjectiles.push({
            mesh: proj,
            light: light,
            velocity: dir.clone().multiplyScalar(12),
            damage: damage,
            life: 5
        });
    }

    _updateEnemyProjectiles(dt) {
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
            p.light.position.copy(p.mesh.position);
            p.life -= dt;

            let hit = false;
            if (this.player && !this.player.dead) {
                if (p.mesh.position.distanceTo(this.player.getPosition().clone().add(new THREE.Vector3(0, 1, 0))) < 1.5) {
                    this.player.takeDamage(p.damage);
                    hit = true;
                }
            }

            for (const plat of this.level ? this.level.platforms : []) {
                const py = p.mesh.position.y;
                const topY = plat.pos.y + plat.size.y / 2;
                if (py <= topY + 0.5 && py >= plat.pos.y - plat.size.y / 2) {
                    const dx = p.mesh.position.x - plat.pos.x;
                    const dz = p.mesh.position.z - plat.pos.z;
                    if (Math.abs(dx) < plat.size.x / 2 && Math.abs(dz) < plat.size.z / 2) {
                        hit = true;
                        break;
                    }
                }
            }

            if (hit || p.life <= 0) {
                this.scene.remove(p.mesh);
                this.scene.remove(p.light);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }

    spawnHitEffect(pos) {
        for (let i = 0; i < 5; i++) {
            const spark = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1),
                new THREE.MeshBasicMaterial({ color: 0xffff00 })
            );
            spark.position.copy(pos);
            this.scene.add(spark);
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            this.effects.push({
                mesh: spark,
                life: 0.4,
                maxLife: 0.4,
                type: 'spark',
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    2 + Math.random() * 3,
                    Math.sin(angle) * speed
                )
            });
        }
    }

    spawnDeathEffect(pos, scale = 1) {
        for (let i = 0; i < 15 * scale; i++) {
            const piece = new THREE.Mesh(
                new THREE.BoxGeometry(0.2 * scale, 0.2 * scale, 0.2 * scale),
                new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
                })
            );
            piece.position.copy(pos);
            piece.position.y += 1;
            this.scene.add(piece);
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 6;
            this.effects.push({
                mesh: piece,
                life: 1.5,
                maxLife: 1.5,
                type: 'debris',
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    5 + Math.random() * 5,
                    Math.sin(angle) * speed
                )
            });
        }
    }

    spawnPickupEffect(pos, color) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.3, 0.5, 16),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide
            })
        );
        ring.position.copy(pos);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.effects.push({
            mesh: ring,
            life: 0.5,
            maxLife: 0.5,
            type: 'pickup'
        });
    }

    spawnDamageNumber(pos, amount) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#ff4444';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(amount, 64, 32);
        ctx.fillText(amount, 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(pos);
        sprite.scale.set(2, 1, 1);
        this.scene.add(sprite);

        this.effects.push({
            mesh: sprite,
            life: 0.8,
            maxLife: 0.8,
            type: 'damage',
            velocity: new THREE.Vector3(0, 3, 0),
            texture: texture
        });
    }

    spawnSlashEffect(pos) {
        const slash = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 3),
            new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            })
        );
        slash.position.copy(pos);
        slash.lookAt(this.camera.position);
        this.scene.add(slash);
        this.effects.push({
            mesh: slash,
            life: 0.2,
            maxLife: 0.2,
            type: 'slash'
        });
    }

    _updateEffects(dt) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];
            e.life -= dt;

            if (e.type === 'shockwave') {
                const t = 1 - e.life / e.maxLife;
                const radius = e.startRadius + (e.endRadius - e.startRadius) * t;
                e.mesh.scale.setScalar(radius);
                e.mesh.material.opacity = (1 - t) * 0.8;
            } else if (e.type === 'fire') {
                e.mesh.material.opacity = (e.life / e.maxLife) * 0.5;
            } else if (e.type === 'spark' || e.type === 'debris') {
                e.mesh.position.add(e.velocity.clone().multiplyScalar(dt));
                e.velocity.y -= 15 * dt;
                e.mesh.material.opacity = e.life / e.maxLife;
                if (e.type === 'debris') {
                    e.mesh.rotation.x += dt * 10;
                    e.mesh.rotation.y += dt * 8;
                }
            } else if (e.type === 'damage') {
                e.mesh.position.add(e.velocity.clone().multiplyScalar(dt));
                e.mesh.material.opacity = e.life / e.maxLife;
            } else if (e.type === 'pickup') {
                const t = 1 - e.life / e.maxLife;
                e.mesh.scale.setScalar(1 + t * 2);
                e.mesh.material.opacity = 1 - t;
            } else if (e.type === 'slash') {
                e.mesh.material.opacity = (e.life / e.maxLife) * 0.5;
            }

            if (e.life <= 0) {
                this.scene.remove(e.mesh);
                if (e.mesh.geometry) e.mesh.geometry.dispose();
                if (e.mesh.material) e.mesh.material.dispose();
                if (e.texture) e.texture.dispose();
                this.effects.splice(i, 1);
            }
        }
    }

    _updateCamera(dt) {
        if (!this.player) return;

        const playerPos = this.player.getPosition();
        const angle = this.input.cameraAngleY;
        const pitch = this.input.cameraAngleX;
        const dist = this.input.cameraDistance;

        const camHeight = Math.sin(pitch) * dist;
        const camDist = Math.cos(pitch) * dist;

        const targetX = playerPos.x - Math.sin(angle) * camDist;
        const targetZ = playerPos.z - Math.cos(angle) * camDist;
        const targetY = playerPos.y + camHeight + 2;

        this.cameraTarget.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.08);
        this.camera.position.copy(this.cameraTarget);

        const lookTarget = playerPos.clone();
        lookTarget.y += 1.5;
        this.camera.lookAt(lookTarget);
    }

    _clearScene() {
        if (this.player) { this.player.dispose(); this.player = null; }
        if (this.boss) { this.boss.dispose(); this.boss = null; }
        for (const e of this.enemies) { e.dispose(); }
        this.enemies = [];
        if (this.level) { this.level.dispose(); this.level = null; }

        for (const e of this.effects) {
            this.scene.remove(e.mesh);
            if (e.mesh.geometry) e.mesh.geometry.dispose();
            if (e.mesh.material) e.mesh.material.dispose();
        }
        this.effects = [];

        for (const p of this.enemyProjectiles) {
            this.scene.remove(p.mesh);
            this.scene.remove(p.light);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
        }
        this.enemyProjectiles = [];

        const toRemove = [];
        this.scene.traverse(obj => {
            if (obj !== this.scene && obj.type !== 'PerspectiveCamera') {
                toRemove.push(obj);
            }
        });
        toRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });

        this.ui.hideBossHealth();
    }
}
