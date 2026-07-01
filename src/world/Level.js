import * as THREE from 'three';

export class Level {
    constructor(scene, levelData) {
        this.scene = scene;
        this.data = levelData;
        this.platforms = [];
        this.crystals = [];
        this.coins = [];
        this.objects = [];
        this.bossArenaCenter = new THREE.Vector3(...(levelData.bossArenaPos || [0, 0, 80]));
        this.bossArenaRadius = 15;
    }

    build() {
        this._setupLighting();
        this._buildPlatforms();
        this._buildDecorations();
        this._buildCrystals();
        this._buildCoins();
        this._buildBossArena();
    }

    _setupLighting() {
        const data = this.data;

        const ambient = new THREE.AmbientLight(new THREE.Color(data.ambientColor), 0.5);
        this.scene.add(ambient);
        this.objects.push(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, data.lightIntensity || 1.2);
        sun.position.set(20, 40, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 150;
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 80;
        sun.shadow.camera.bottom = -20;
        sun.shadow.bias = -0.0005;
        this.scene.add(sun);
        this.objects.push(sun);

        const hemi = new THREE.HemisphereLight(new THREE.Color(data.skyColor), new THREE.Color(data.groundColor), 0.4);
        this.scene.add(hemi);
        this.objects.push(hemi);

        this.scene.background = new THREE.Color(data.skyColor || '#87ceeb');
        this.scene.fog = new THREE.Fog(new THREE.Color(data.fogColor || '#a8e6cf'), 40, 120);
    }

    _buildPlatforms() {
        for (const pdef of this.data.platforms) {
            const size = new THREE.Vector3(...pdef.size);
            const pos = new THREE.Vector3(...pdef.pos);

            const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
            const mat = new THREE.MeshStandardMaterial({
                color: pdef.color || '#4a7c3c',
                roughness: 0.8,
                metalness: 0.05
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.copy(pos);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            this.scene.add(mesh);

            if (Math.abs(size.x) > 2 && Math.abs(size.z) > 2) {
                const studGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
                const studMat = new THREE.MeshStandardMaterial({
                    color: pdef.color || '#4a7c3c',
                    roughness: 0.7
                });
                const studSpacing = 1.0;
                const countX = Math.floor(size.x / studSpacing) - 1;
                const countZ = Math.floor(size.z / studSpacing) - 1;
                const topY = pos.y + size.y / 2 + 0.05;
                for (let i = 0; i < countX; i++) {
                    for (let j = 0; j < countZ; j++) {
                        const stud = new THREE.Mesh(studGeom, studMat);
                        stud.position.set(
                            pos.x - (countX - 1) * studSpacing / 2 + i * studSpacing,
                            topY,
                            pos.z - (countZ - 1) * studSpacing / 2 + j * studSpacing
                        );
                        this.scene.add(stud);
                        this.objects.push(stud);
                    }
                }
            }

            this.platforms.push({ pos, size });
            this.objects.push(mesh);
        }
    }

    _buildDecorations() {
        for (const d of this.data.decorations || []) {
            const pos = new THREE.Vector3(...d.pos);
            if (d.type === 'tree') {
                this._buildTree(pos);
            } else if (d.type === 'rock') {
                this._buildRock(pos);
            }
        }
    }

    _buildTree(pos) {
        const trunkMat = new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.9 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8), trunkMat);
        trunk.position.set(pos.x, 1.25, pos.z);
        trunk.castShadow = true;
        this.scene.add(trunk);
        this.objects.push(trunk);

        const leafColors = ['#2d6a2d', '#3a8a3a', '#1f5a1f'];
        for (let i = 0; i < 3; i++) {
            const leafMat = new THREE.MeshStandardMaterial({
                color: leafColors[i % leafColors.length],
                roughness: 0.7
            });
            const size = 1.8 - i * 0.3;
            const leaves = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), leafMat);
            leaves.position.set(pos.x, 3 + i * 1.2, pos.z);
            leaves.rotation.y = i * 0.3;
            leaves.castShadow = true;
            this.scene.add(leaves);
            this.objects.push(leaves);
        }

        const stud = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8),
            new THREE.MeshStandardMaterial({ color: '#2d6a2d', roughness: 0.7 })
        );
        stud.position.set(pos.x, 4.8, pos.z);
        this.scene.add(stud);
        this.objects.push(stud);
    }

    _buildRock(pos) {
        const rockMat = new THREE.MeshStandardMaterial({ color: '#787878', roughness: 0.9 });
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), rockMat);
        rock.position.set(pos.x, 0.8, pos.z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
        this.objects.push(rock);

        const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat);
        rock2.position.set(pos.x + 0.8, 0.5, pos.z + 0.3);
        rock2.castShadow = true;
        this.scene.add(rock2);
        this.objects.push(rock2);
    }

    _buildCrystals() {
        for (const cdef of this.data.crystalSpawns || []) {
            const pos = new THREE.Vector3(...cdef.pos);
            const geom = new THREE.OctahedronGeometry(0.4, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: 0x00ffaa,
                emissive: 0x00ff88,
                emissiveIntensity: 0.8,
                roughness: 0.2,
                metalness: 0.3,
                transparent: true,
                opacity: 0.85
            });
            const crystal = new THREE.Mesh(geom, mat);
            crystal.position.copy(pos);
            crystal.castShadow = true;
            this.scene.add(crystal);

            const light = new THREE.PointLight(0x00ffaa, 0.8, 5);
            light.position.copy(pos);
            this.scene.add(light);
            this.objects.push(light);

            this.crystals.push({ mesh: crystal, pos, collected: false, bobTime: Math.random() * 10 });
            this.objects.push(crystal);
        }
    }

    _buildCoins() {
        const coinGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12);
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffaa00,
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: 0.8
        });

        for (const cdef of this.data.coinSpawns || []) {
            const pos = new THREE.Vector3(...cdef.pos);
            const coin = new THREE.Mesh(coinGeom, coinMat);
            coin.position.copy(pos);
            coin.rotation.x = Math.PI / 2;
            coin.castShadow = true;
            this.scene.add(coin);

            this.coins.push({ mesh: coin, pos, collected: false, bobTime: Math.random() * 10 });
            this.objects.push(coin);
        }
    }

    _buildBossArena() {
        const center = this.bossArenaCenter;
        const radius = this.bossArenaRadius;

        const floorGeom = new THREE.CylinderGeometry(radius, radius, 0.5, 32);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x3a6c2c,
            roughness: 0.7
        });
        const floor = new THREE.Mesh(floorGeom, floorMat);
        floor.position.set(center.x, center.y + 0.25, center.z);
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.objects.push(floor);

        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x5d4037,
            roughness: 0.8
        });
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const px = center.x + Math.cos(angle) * (radius + 1);
            const pz = center.z + Math.sin(angle) * (radius + 1);
            const pillar = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 3, 0.8),
                pillarMat
            );
            pillar.position.set(px, 1.5, pz);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.scene.add(pillar);
            this.objects.push(pillar);
        }

        this.platforms.push({
            pos: new THREE.Vector3(center.x, center.y + 0.5, center.z),
            size: new THREE.Vector3(radius * 2, 0.5, radius * 2)
        });
    }

    update(dt, playerPos) {
        for (const c of this.crystals) {
            if (c.collected) continue;
            c.bobTime += dt * 2;
            c.mesh.position.y = c.pos.y + Math.sin(c.bobTime) * 0.3;
            c.mesh.rotation.y += dt * 2;
        }

        for (const coin of this.coins) {
            if (coin.collected) continue;
            coin.bobTime += dt * 3;
            coin.mesh.position.y = coin.pos.y + Math.sin(coin.bobTime) * 0.2;
            coin.mesh.rotation.z += dt * 4;
        }
    }

    checkCrystalPickup(playerPos) {
        const collected = [];
        for (const c of this.crystals) {
            if (c.collected) continue;
            if (c.mesh.position.distanceTo(playerPos) < 1.5) {
                c.collected = true;
                c.mesh.visible = false;
                collected.push(c);
            }
        }
        return collected;
    }

    checkCoinPickup(playerPos) {
        let count = 0;
        for (const coin of this.coins) {
            if (coin.collected) continue;
            if (coin.mesh.position.distanceTo(playerPos) < 1.5) {
                coin.collected = true;
                coin.mesh.visible = false;
                count++;
            }
        }
        return count;
    }

    isInBossArena(playerPos) {
        const dx = playerPos.x - this.bossArenaCenter.x;
        const dz = playerPos.z - this.bossArenaCenter.z;
        return Math.sqrt(dx * dx + dz * dz) < this.bossArenaRadius;
    }

    dispose() {
        for (const obj of this.objects) {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }
        for (const c of this.crystals) {
            this.scene.remove(c.mesh);
            if (c.mesh.geometry) c.mesh.geometry.dispose();
            if (c.mesh.material) c.mesh.material.dispose();
        }
        for (const coin of this.coins) {
            this.scene.remove(coin.mesh);
        }
        this.objects = [];
        this.crystals = [];
        this.coins = [];
        this.platforms = [];
    }
}
