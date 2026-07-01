import * as THREE from 'three';
import { LegoFigure } from './LegoFigure.js';

export class Enemy {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        this.dead = false;
        this.stunned = 0;

        const enemyConfigs = {
            block_beetle: { health: 40, speed: 2.5, attack: 8, attackRange: 1.5, colors: { body: '#2d5016', detail: '#4a7c20' } },
            fire_imp: { health: 50, speed: 3.5, attack: 12, attackRange: 1.5, colors: { body: '#8b2500', detail: '#ff4500' } },
            ice_golem: { health: 80, speed: 1.5, attack: 15, attackRange: 2, colors: { body: '#85c1e9', detail: '#aed6f1' } }
        };

        const cfg = enemyConfigs[type] || enemyConfigs.block_beetle;
        this.stats = { ...cfg };
        this.maxHealth = cfg.health;
        this.health = cfg.health;

        this.mesh = LegoFigure.createEnemyBeetle(cfg.colors);
        this.mesh.position.copy(position);
        this.mesh.position.y = position.y || 0;
        scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
        this.attackCooldown = 0;
        this.knockbackVel = new THREE.Vector3();
        this.attackAnimTime = 0;
        this.bobTime = Math.random() * Math.PI * 2;
        this.spawnY = position.y || 0;
    }

    update(dt, playerPos, game) {
        if (this.dead) return;

        if (this.stunned > 0) {
            this.stunned -= dt;
            this._applyKnockback(dt);
            return;
        }

        this.bobTime += dt * 6;
        this.mesh.position.y = this.spawnY + 0.5 + Math.abs(Math.sin(this.bobTime)) * 0.15;

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.attackAnimTime > 0) this.attackAnimTime -= dt;

        const toPlayer = playerPos.clone().sub(this.mesh.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();

        if (dist > 0.1) toPlayer.normalize();

        if (dist > this.stats.attackRange) {
            this.velocity.x = toPlayer.x * this.stats.speed;
            this.velocity.z = toPlayer.z * this.stats.speed;
            this.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        } else {
            this.velocity.x *= 0.5;
            this.velocity.z *= 0.5;
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 1.5;
                this.attackAnimTime = 0.3;
                game.player.takeDamage(this.stats.attack);
            }
        }

        this._applyKnockback(dt);

        this.mesh.position.x += this.velocity.x * dt;
        this.mesh.position.z += this.velocity.z * dt;

        const moving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1;
        if (moving) {
            this.mesh.rotation.z = Math.sin(this.bobTime) * 0.15;
        }
    }

    _applyKnockback(dt) {
        if (this.knockbackVel.lengthSq() > 0.01) {
            this.mesh.position.x += this.knockbackVel.x * dt;
            this.mesh.position.z += this.knockbackVel.z * dt;
            this.knockbackVel.multiplyScalar(0.85);
        }
    }

    takeDamage(amount, game) {
        if (this.dead) return;
        this.health -= amount;
        game.spawnDamageNumber(this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), Math.round(amount));
        game.spawnHitEffect(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            game.onEnemyKilled(this);
            this._die();
        }
    }

    knockback(force) {
        this.knockbackVel.copy(force);
    }

    stun(duration) {
        this.stunned = duration;
    }

    getPosition() {
        return this.mesh.position;
    }

    _die() {
        this.scene.remove(this.mesh);
        this.mesh.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
    }

    dispose() {
        if (!this.dead) this._die();
    }
}
