import * as THREE from 'three';
import { LegoFigure } from './LegoFigure.js';

export class Boss {
    constructor(scene, bossData) {
        this.scene = scene;
        this.bossData = bossData;
        this.stats = JSON.parse(JSON.stringify(bossData.stats));
        this.dead = false;
        this.stunned = 0;

        this.maxHealth = this.stats.health;
        this.health = this.maxHealth;

        const bossBuilders = {
            brick_beast: (colors, scale) => LegoFigure.createBoss(colors, scale),
            inferno_dragon: (colors, scale) => LegoFigure.createDragon(colors),
            frost_witch: (colors, scale) => LegoFigure.createWitch(colors)
        };

        const builder = bossBuilders[bossData.id] || bossBuilders.brick_beast;
        this.mesh = builder(bossData.colors, bossData.scale || 2.5);

        if (bossData.id === 'inferno_dragon' || bossData.id === 'frost_witch') {
            this.mesh.scale.setScalar((bossData.scale || 2.5) * 0.8);
        }

        scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
        this.attackCooldown = 2;
        this.currentPhaseIndex = 0;
        this.knockbackVel = new THREE.Vector3();
        this.attackAnimTime = 0;
        this.currentAttack = null;
        this.weaknessTimer = 0;
        this.isWeak = false;
        this.bobTime = 0;
        this.spawnPos = new THREE.Vector3(0, 0, 80);
        this.facingAngle = 0;
        this.introTime = 2;
        this.flying = false;
    }

    setPosition(pos) {
        this.mesh.position.copy(pos);
        this.spawnPos.copy(pos);
    }

    update(dt, playerPos, game) {
        if (this.dead) return;

        if (this.introTime > 0) {
            this.introTime -= dt;
            return;
        }

        if (this.stunned > 0) {
            this.stunned -= dt;
            return;
        }

        this.bobTime += dt * 3;
        if (this.flying) {
            this.mesh.position.y = this.spawnPos.y + 3 + Math.sin(this.bobTime) * 0.5;
        }

        const hpPercent = (this.health / this.maxHealth) * 100;
        const phases = this.bossData.phases;
        let phaseIdx = 0;
        for (let i = 0; i < phases.length; i++) {
            if (hpPercent <= phases[i].atHealthPercent) phaseIdx = i;
        }
        this.currentPhaseIndex = phaseIdx;
        const phase = phases[phaseIdx];

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.attackAnimTime > 0) this.attackAnimTime -= dt;
        if (this.weaknessTimer > 0) {
            this.weaknessTimer -= dt;
            if (this.weaknessTimer <= 0) this.isWeak = false;
        }

        const toPlayer = playerPos.clone().sub(this.mesh.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();
        if (dist > 0.1) toPlayer.normalize();

        this.facingAngle = Math.atan2(toPlayer.x, toPlayer.z);
        this.mesh.rotation.y = this._lerpAngle(this.mesh.rotation.y, this.facingAngle, 0.1);

        const speed = this.stats.speed * 0.6;
        if (this.currentAttack === null && this.attackCooldown <= 0 && !this.isWeak) {
            if (dist > 15 && phase.attacks.includes('fireball')) {
                this._startAttack('fireball');
            } else if (dist > 10 && phase.attacks.includes('ice_shards')) {
                this._startAttack('ice_shards');
            } else if (dist > 8 && phase.attacks.includes('fire_breath')) {
                this._startAttack('fire_breath');
            } else if (dist > 6) {
                this.velocity.x = toPlayer.x * speed;
                this.velocity.z = toPlayer.z * speed;
            } else {
                const attackName = phase.attacks[Math.floor(Math.random() * phase.attacks.length)];
                this._startAttack(attackName);
            }
        } else if (this.currentAttack === null) {
            if (dist > 6) {
                this.velocity.x = toPlayer.x * speed;
                this.velocity.z = toPlayer.z * speed;
            } else {
                this.velocity.x *= 0.5;
                this.velocity.z *= 0.5;
            }
        }

        if (this.currentAttack !== null) {
            this.velocity.x *= 0.3;
            this.velocity.z *= 0.3;
            this._updateAttack(dt, playerPos, game);
        }

        this.mesh.position.x += this.velocity.x * dt;
        this.mesh.position.z += this.velocity.z * dt;

        const dx = this.mesh.position.x - this.spawnPos.x;
        const dz = this.mesh.position.z - this.spawnPos.z;
        const arenaRadius = 14;
        const distFromCenter = Math.sqrt(dx * dx + dz * dz);
        if (distFromCenter > arenaRadius) {
            this.mesh.position.x = this.spawnPos.x + (dx / distFromCenter) * arenaRadius;
            this.mesh.position.z = this.spawnPos.z + (dz / distFromCenter) * arenaRadius;
        }

        if (!this.flying) {
            this.mesh.position.y = this.spawnPos.y + Math.sin(this.bobTime) * 0.15;
        }
    }

    _startAttack(attackName) {
        const attack = this.bossData.attacks[attackName];
        if (!attack) return;
        this.currentAttack = attackName;
        this.attackAnimTime = attack.windup;
        this._attackData = attack;
        this._attackExecuted = false;

        const armR = this.mesh.userData.armR;
        const armL = this.mesh.userData.armL;
        if (attackName === 'claw_slash' && armR) {
            armR.rotation.x = -1.5;
        } else if (attackName === 'ground_pound' && armR && armL) {
            armR.rotation.x = -2.5;
            armL.rotation.x = -2.5;
        } else if (this.bossData.id === 'frost_witch' && armR) {
            armR.rotation.z = -1.5;
        }
    }

    _updateAttack(dt, playerPos, game) {
        const attack = this._attackData;
        if (!attack) return;

        if (this.attackAnimTime > 0 && !this._attackExecuted) {
            return;
        }

        if (!this._attackExecuted) {
            this._attackExecuted = true;
            this._executeAttack(attack, playerPos, game);
        }

        const recovery = attack.recovery || 1.0;
        this.attackAnimTime += dt;

        if (this.attackAnimTime >= recovery + attack.windup) {
            this.currentAttack = null;
            this.attackCooldown = this.bossData.phases[this.currentPhaseIndex].attackInterval;

            if (attack.type === 'aoe' || attack.type === 'cone') {
                this.isWeak = true;
                this.weaknessTimer = this.bossData.weaknessWindow?.duration || 3;
            }

            const armR = this.mesh.userData.armR;
            const armL = this.mesh.userData.armL;
            if (armR) { armR.rotation.x = 0; armR.rotation.z = -0.15; }
            if (armL) { armL.rotation.x = 0; armL.rotation.z = 0.15; }
        }
    }

    _executeAttack(attack, playerPos, game) {
        const bossPos = this.mesh.position.clone();
        const toPlayer = playerPos.clone().sub(bossPos);
        toPlayer.y = 0;
        const dist = toPlayer.length();
        if (dist > 0.1) toPlayer.normalize();

        switch (attack.type) {
            case 'melee':
                if (dist <= attack.range) {
                    game.player.takeDamage(attack.damage);
                    game.spawnSlashEffect(bossPos.clone().add(toPlayer.clone().multiplyScalar(2)));
                }
                break;

            case 'aoe':
                game.spawnShockwave(bossPos, attack.range);
                if (dist <= attack.range + 1) {
                    game.player.takeDamage(attack.damage);
                }
                break;

            case 'cone':
                game.spawnFireCone(bossPos, toPlayer, attack.range);
                if (dist <= attack.range) {
                    game.player.takeDamage(attack.damage);
                }
                break;

            case 'projectile':
                game.spawnEnemyProjectile(bossPos.clone().add(new THREE.Vector3(0, 3, 0)), toPlayer, attack.damage, '#ff6600');
                break;

            case 'fan_projectile':
                for (let i = -2; i <= 2; i++) {
                    const angle = i * 0.25;
                    const dir = toPlayer.clone();
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const newDir = new THREE.Vector3(
                        dir.x * cos - dir.z * sin, 0, dir.x * sin + dir.z * cos
                    );
                    game.spawnEnemyProjectile(bossPos.clone().add(new THREE.Vector3(0, 3, 0)), newDir, attack.damage, '#00ffff');
                }
                break;

            case 'debuff':
                game.player.takeDamage(attack.damage);
                game.onPlayerSlowed(3);
                break;
        }

        game.onBossAttack(attack);
    }

    takeDamage(amount, game) {
        if (this.dead) return;
        this.health -= amount;
        game.spawnDamageNumber(this.mesh.position.clone().add(new THREE.Vector3(0, 4, 0)), Math.round(amount));
        game.spawnHitEffect(this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)));

        this.mesh.children.forEach(child => {
            if (child.material) {
                const origColor = child.material.color.getHex();
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 0.8;
                setTimeout(() => {
                    if (child.material) {
                        child.material.emissiveIntensity = 0;
                    }
                }, 80);
            }
        });

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            game.onBossKilled(this);
        }
    }

    knockback(force) {
    }

    stun(duration) {
        this.stunned = duration;
    }

    getPosition() {
        return this.mesh.position;
    }

    getHealthPercent() {
        return (this.health / this.maxHealth) * 100;
    }

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
    }
}
