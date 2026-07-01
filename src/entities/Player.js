import * as THREE from 'three';
import { LegoFigure } from './LegoFigure.js';

export class Player {
    constructor(scene, heroData) {
        this.scene = scene;
        this.heroData = heroData;
        this.stats = JSON.parse(JSON.stringify(heroData.stats));

        this.mesh = LegoFigure.createHero(heroData.colors);
        this.mesh.position.set(0, 0, 0);
        scene.add(this.mesh);

        this.velocity = new THREE.Vector3(0, 0, 0);
        this.forward = new THREE.Vector3(0, 0, -1);
        this.onGround = true;

        this.maxHealth = this.stats.health;
        this.health = this.maxHealth;
        this.dead = false;

        this.attackCooldown = 0;
        this.attackAnimTime = 0;
        this.isAttacking = false;
        this.comboCount = 0;
        this.comboResetTime = 0;

        this.specialCooldown = 0;
        this.specialActive = 0;
        this.specialActiveName = null;

        this.dashCooldown = 0;
        this.dashTime = 0;
        this.isDashing = false;

        this.invulnTime = 0;
        this.walkAnimTime = 0;
        this.jumpRequested = false;
        this.doubleJumpUsed = false;

        this.hitEnemies = new Set();
        this.projectiles = [];

        this.facingAngle = 0;
    }

    update(dt, input, cameraAngleY, platforms, enemies, boss, game) {
        if (this.dead) return;

        if (this.invulnTime > 0) this.invulnTime -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.specialCooldown > 0) this.specialCooldown -= dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.specialActive > 0) this.specialActive -= dt;
        if (this.comboResetTime > 0) {
            this.comboResetTime -= dt;
            if (this.comboResetTime <= 0) this.comboCount = 0;
        }

        const moveInput = input.getMoveInput();
        const cosA = Math.cos(cameraAngleY);
        const sinA = Math.sin(cameraAngleY);

        let moveX = moveInput.x * cosA - moveInput.z * sinA;
        let moveZ = moveInput.x * sinA + moveInput.z * cosA;

        if (this.isDashing) {
            this.dashTime -= dt;
            if (this.dashTime <= 0) {
                this.isDashing = false;
                this.velocity.x = 0;
                this.velocity.z = 0;
            } else {
                this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
                this._handlePlatformCollision(platforms);
                this._updateAnimation(dt, true);
                return;
            }
        }

        const speed = this.stats.speed;
        if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
            this.velocity.x = moveX * speed;
            this.velocity.z = moveZ * speed;
            this.facingAngle = Math.atan2(moveX, moveZ);
        } else {
            this.velocity.x *= 0.8;
            this.velocity.z *= 0.8;
        }

        if (input.getJumpPressed() && !this.jumpRequested) {
            this.jumpRequested = true;
            if (this.onGround) {
                this.velocity.y = this.stats.jumpPower;
                this.onGround = false;
                this.doubleJumpUsed = false;
            } else if (!this.doubleJumpUsed && this.heroData.id === 'shadow') {
                this.velocity.y = this.stats.jumpPower * 0.85;
                this.doubleJumpUsed = true;
            }
        }
        if (!input.getJumpPressed()) {
            this.jumpRequested = false;
        }

        if (input.getDashPressed() && this.dashCooldown <= 0 && !this.isDashing) {
            this._dash(moveX, moveZ);
        }

        this.velocity.y -= 25 * dt;

        this.mesh.position.x += this.velocity.x * dt;
        this.mesh.position.z += this.velocity.z * dt;
        this.mesh.position.y += this.velocity.y * dt;

        this._handlePlatformCollision(platforms);

        this.mesh.rotation.y = this._lerpAngle(this.mesh.rotation.y, this.facingAngle, 0.2);

        if (input.getAttackPressed() && this.attackCooldown <= 0) {
            this._attack(enemies, boss, game);
        }

        if (input.getSpecialPressed() && this.specialCooldown <= 0) {
            this._useSpecial(enemies, boss, game);
        }

        this._updateAnimation(dt, Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01);

        if (this.specialActiveName === 'invisibility' && this.specialActive > 0) {
            this.mesh.visible = false;
        } else {
            this.mesh.visible = true;
        }

        if (this.mesh.position.y < -20) {
            this.takeDamage(9999);
        }
    }

    _handlePlatformCollision(platforms) {
        const px = this.mesh.position.x;
        const pz = this.mesh.position.z;
        const py = this.mesh.position.y;
        let landed = false;

        for (const p of platforms) {
            const halfW = p.size.x / 2;
            const halfD = p.size.z / 2;
            const topY = p.pos.y + p.size.y / 2;

            if (px > p.pos.x - halfW && px < p.pos.x + halfW &&
                pz > p.pos.z - halfD && pz < p.pos.z + halfD) {
                if (this.velocity.y <= 0 && py >= topY - 0.5 && py <= topY + 1.5) {
                    this.mesh.position.y = topY;
                    this.velocity.y = 0;
                    this.onGround = true;
                    this.doubleJumpUsed = false;
                    landed = true;
                    break;
                }
            }
        }
        if (!landed && this.velocity.y < -0.1) {
            this.onGround = false;
        }
    }

    _dash(moveX, moveZ) {
        this.isDashing = true;
        this.dashTime = 0.25;
        this.dashCooldown = 1.0;
        this.invulnTime = 0.25;

        let dx = moveX, dz = moveZ;
        if (Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01) {
            dx = Math.sin(this.facingAngle);
            dz = Math.cos(this.facingAngle);
        }
        const len = Math.sqrt(dx * dx + dz * dz);
        dx /= len; dz /= len;

        this.velocity.x = dx * 18;
        this.velocity.z = dz * 18;
        this.velocity.y = 0;
    }

    _attack(enemies, boss, game) {
        this.isAttacking = true;
        this.attackAnimTime = 0.3;
        this.comboCount++;
        this.comboResetTime = 1.0;
        if (this.comboCount > 3) this.comboCount = 1;

        const atkSpeed = this.stats.attackSpeed;
        this.attackCooldown = 1 / atkSpeed;

        let damage = this.stats.attack;
        if (this.comboCount === 3) damage *= 1.5;

        const range = this.stats.attackRange;
        const playerPos = this.mesh.position.clone();
        const facingDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));

        if (this.heroData.id === 'spark') {
            this._spawnProjectile(playerPos, facingDir, damage, game);
            return;
        }

        const allTargets = [];
        if (enemies) enemies.forEach(e => { if (!e.dead) allTargets.push(e); });
        if (boss && !boss.dead) allTargets.push(boss);

        let hitSomething = false;
        for (const target of allTargets) {
            const toTarget = target.getPosition().clone().sub(playerPos);
            toTarget.y = 0;
            const dist = toTarget.length();
            if (dist <= range) {
                toTarget.normalize();
                const dot = toTarget.dot(facingDir);
                const angleRange = this.heroData.id === 'goliath' ? Math.PI : Math.PI / 2;
                if (dot > Math.cos(angleRange)) {
                    target.takeDamage(damage, game);
                    hitSomething = true;
                    if (this.heroData.id === 'goliath') {
                        const knockback = facingDir.clone().multiplyScalar(5);
                        target.knockback(knockback);
                    }
                }
            }
        }

        if (hitSomething && game) game.onHitLanded();
    }

    _spawnProjectile(pos, dir, damage, game) {
        const geom = new THREE.SphereGeometry(0.2, 8, 8);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xbb8fce, emissive: 0x9b59b6, emissiveIntensity: 1.5
        });
        const proj = new THREE.Mesh(geom, mat);
        proj.position.copy(pos);
        proj.position.y += 2;
        this.scene.add(proj);

        this.projectiles.push({
            mesh: proj,
            velocity: dir.clone().multiplyScalar(20),
            damage: damage,
            life: 3,
            game: game
        });
    }

    updateProjectiles(dt, enemies, boss, game) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
            p.life -= dt;

            let hit = false;
            const allTargets = [];
            if (enemies) enemies.forEach(e => { if (!e.dead) allTargets.push(e); });
            if (boss && !boss.dead) allTargets.push(boss);

            for (const target of allTargets) {
                if (p.mesh.position.distanceTo(target.getPosition()) < 1.5) {
                    target.takeDamage(p.damage, game);
                    hit = true;
                    break;
                }
            }

            if (hit || p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }

    _useSpecial(enemies, boss, game) {
        const special = this.heroData.special;
        this.specialCooldown = special.cooldown;
        this.specialActiveName = special.name;
        this.specialActive = special.duration;
        const playerPos = this.mesh.position.clone();

        switch (special.name) {
            case 'shield_barrier':
                this.invulnTime = special.duration;
                break;

            case 'dash_strike': {
                const facingDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
                const allTargets = [];
                if (enemies) enemies.forEach(e => { if (!e.dead) allTargets.push(e); });
                if (boss && !boss.dead) allTargets.push(boss);

                let nearest = null, nearestDist = Infinity;
                for (const t of allTargets) {
                    const d = t.getPosition().distanceTo(playerPos);
                    if (d < nearestDist && d < 15) { nearest = t; nearestDist = d; }
                }
                if (nearest) {
                    const targetPos = nearest.getPosition();
                    this.mesh.position.x = targetPos.x - facingDir.x * 1.5;
                    this.mesh.position.z = targetPos.z - facingDir.z * 1.5;
                    nearest.takeDamage(this.stats.attack * 3, game);
                    game.onHitLanded();
                }
                break;
            }

            case 'earthquake': {
                const range = 8;
                const allTargets = [];
                if (enemies) enemies.forEach(e => { if (!e.dead) allTargets.push(e); });
                if (boss && !boss.dead) allTargets.push(boss);
                for (const t of allTargets) {
                    if (t.getPosition().distanceTo(playerPos) < range) {
                        t.takeDamage(this.stats.attack * 2, game);
                        t.stun(2);
                    }
                }
                game.spawnShockwave(playerPos, range);
                game.onHitLanded();
                break;
            }

            case 'energy_storm': {
                const range = 12;
                for (let i = 0; i < 10; i++) {
                    setTimeout(() => {
                        const allTargets = [];
                        if (enemies) enemies.forEach(e => { if (!e.dead) allTargets.push(e); });
                        if (boss && !boss.dead) allTargets.push(boss);
                        for (const t of allTargets) {
                            const d = t.getPosition().distanceTo(this.mesh.position);
                            if (d < range) {
                                t.takeDamage(this.stats.attack * 0.5, game);
                            }
                        }
                    }, i * 200);
                }
                break;
            }

            case 'invisibility':
                this.invulnTime = special.duration;
                break;

            case 'charge': {
                const facingDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
                this.velocity.x = facingDir.x * 15;
                this.velocity.z = facingDir.z * 15;
                const allTargets = [];
                if (enemies) enemies.forEach(e => { if (!e.dead) allTargets.push(e); });
                if (boss && !boss.dead) allTargets.push(boss);
                for (const t of allTargets) {
                    if (t.getPosition().distanceTo(playerPos) < 5) {
                        t.takeDamage(this.stats.attack * 1.5, game);
                        const kb = facingDir.clone().multiplyScalar(8);
                        t.knockback(kb);
                    }
                }
                game.onHitLanded();
                break;
            }
        }
        game.onSpecialUsed(special);
    }

    takeDamage(amount) {
        if (this.invulnTime > 0) return;
        if (this.specialActiveName === 'shield_barrier' && this.specialActive > 0) return;

        const reduced = amount * (1 - this.stats.defense / 100);
        this.health -= reduced;
        this.invulnTime = 0.8;

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    getPosition() {
        return this.mesh.position;
    }

    getSpecialCooldownPercent() {
        if (this.specialCooldown <= 0) return 100;
        const max = this.heroData.special.cooldown;
        return ((max - this.specialCooldown) / max) * 100;
    }

    _updateAnimation(dt, isMoving) {
        const ud = this.mesh.userData;

        if (this.attackAnimTime > 0) {
            this.attackAnimTime -= dt;
            const progress = 1 - (this.attackAnimTime / 0.3);
            const swing = Math.sin(progress * Math.PI) * 1.5;
            ud.armR.rotation.x = -swing;
            if (this.attackAnimTime <= 0) {
                ud.armR.rotation.x = 0;
                this.isAttacking = false;
            }
        }

        if (isMoving && this.onGround) {
            this.walkAnimTime += dt * 8;
            const swing = Math.sin(this.walkAnimTime) * 0.4;
            if (ud.legL) ud.legL.rotation.x = swing;
            if (ud.legR) ud.legR.rotation.x = -swing;
            if (!this.isAttacking) {
                ud.armL.rotation.x = -swing * 0.7;
                ud.armR.rotation.x = swing * 0.7;
            }
        } else {
            if (ud.legL) ud.legL.rotation.x = this._lerp(ud.legL.rotation.x, 0, 0.2);
            if (ud.legR) ud.legR.rotation.x = this._lerp(ud.legR.rotation.x, 0, 0.2);
            if (!this.isAttacking && ud.armL) {
                ud.armL.rotation.x = this._lerp(ud.armL.rotation.x, 0, 0.2);
            }
        }

        if (!this.onGround) {
            if (ud.legL) ud.legL.rotation.x = -0.5;
            if (ud.legR) ud.legR.rotation.x = 0.3;
        }
    }

    _lerp(a, b, t) { return a + (b - a) * t; }

    _lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        for (const p of this.projectiles) {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        }
        this.projectiles = [];
    }
}
