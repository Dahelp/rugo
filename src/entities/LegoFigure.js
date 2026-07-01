import * as THREE from 'three';

export class LegoFigure {
    static createHero(colors) {
        const group = new THREE.Group();
        const mat = (color) => new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.35,
            metalness: 0.1
        });

        const headColor = mat(colors.head || '#ffd700');
        const torsoColor = mat(colors.torso || '#1a5276');
        const legsColor = mat(colors.legs || '#1a1a2e');
        const armsColor = mat(colors.arms || colors.torso || '#1a5276');
        const weaponColor = mat(colors.weapon || '#c0c0c0');

        const legGroup = new THREE.Group();
        const legL = this._makeBox(0.4, 0.9, 0.45, legsColor);
        legL.position.set(-0.25, 0.45, 0);
        const legR = this._makeBox(0.4, 0.9, 0.45, legsColor);
        legR.position.set(0.25, 0.45, 0);
        legGroup.add(legL, legR);
        group.add(legGroup);

        const hips = this._makeBox(0.95, 0.25, 0.5, legsColor);
        hips.position.y = 1.05;
        group.add(hips);

        const torso = this._makeBox(0.95, 0.85, 0.5, torsoColor);
        torso.position.y = 1.6;
        group.add(torso);

        const armL = new THREE.Group();
        const armLMesh = this._makeBox(0.3, 0.8, 0.35, armsColor);
        armLMesh.position.y = -0.4;
        armL.add(armLMesh);
        armL.position.set(-0.62, 2.0, 0);
        armL.rotation.z = 0.15;
        group.add(armL);

        const armR = new THREE.Group();
        const armRMesh = this._makeBox(0.3, 0.8, 0.35, armsColor);
        armRMesh.position.y = -0.4;
        armR.add(armRMesh);
        armR.position.set(0.62, 2.0, 0);
        armR.rotation.z = -0.15;
        group.add(armR);

        const handL = this._makeBox(0.28, 0.3, 0.32, mat('#f5d18c'));
        handL.position.y = -0.75;
        armL.add(handL);

        const handR = this._makeBox(0.28, 0.3, 0.32, mat('#f5d18c'));
        handR.position.y = -0.75;
        armR.add(handR);

        const headGroup = new THREE.Group();
        const neck = this._makeCyl(0.2, 0.2, 0.15, headColor);
        neck.position.y = 0.05;
        headGroup.add(neck);

        const head = this._makeCyl(0.42, 0.42, 0.55, headColor);
        head.position.y = 0.4;
        headGroup.add(head);

        const stud = this._makeCyl(0.12, 0.12, 0.1, headColor);
        stud.position.y = 0.72;
        headGroup.add(stud);

        const eyeWhite = mat('#ffffff');
        const pupil = mat('#1a1a2e');
        const eyeLW = this._makeBox(0.14, 0.16, 0.05, eyeWhite);
        eyeLW.position.set(-0.12, 0.42, 0.4);
        const eyeRW = this._makeBox(0.14, 0.16, 0.05, eyeWhite);
        eyeRW.position.set(0.12, 0.42, 0.4);
        const pupilL = this._makeBox(0.06, 0.08, 0.03, pupil);
        pupilL.position.set(-0.12, 0.42, 0.43);
        const pupilR = this._makeBox(0.06, 0.08, 0.03, pupil);
        pupilR.position.set(0.12, 0.42, 0.43);
        headGroup.add(eyeLW, eyeRW, pupilL, pupilR);

        const smile = this._makeBox(0.2, 0.04, 0.03, pupil);
        smile.position.set(0, 0.22, 0.4);
        headGroup.add(smile);

        headGroup.position.y = 2.05;
        group.add(headGroup);

        group.userData = {
            armL, armR, legGroup, headGroup, legL, legR,
            weaponPivot: null, shield: null
        };

        const weapon = this._createWeapon(weaponColor, colors.weapon || '#c0c0c0');
        weapon.position.y = -0.7;
        armR.add(weapon);

        return group;
    }

    static createBoss(colors, scale = 2.5) {
        const group = new THREE.Group();
        const mat = (color) => new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.2
        });

        const bodyColor = mat(colors.body || '#5b2c2c');
        const headColor = mat(colors.head || '#7b3f3f');
        const legsColor = mat(colors.legs || '#3d1a1a');
        const detailColor = mat(colors.detail || '#c0392b');

        const legL = this._makeBox(0.7, 1.5, 0.7, legsColor);
        legL.position.set(-0.5, 0.75, 0);
        const legR = this._makeBox(0.7, 1.5, 0.7, legsColor);
        legR.position.set(0.5, 0.75, 0);
        group.add(legL, legR);

        const torso = this._makeBox(1.8, 1.8, 1.0, bodyColor);
        torso.position.y = 2.6;
        group.add(torso);

        const belly = this._makeBox(1.2, 1.0, 0.3, detailColor);
        belly.position.set(0, 2.5, 0.5);
        group.add(belly);

        const shoulderL = this._makeSphere(0.6, bodyColor);
        shoulderL.position.set(-1.1, 3.2, 0);
        const shoulderR = this._makeSphere(0.6, bodyColor);
        shoulderR.position.set(1.1, 3.2, 0);
        group.add(shoulderL, shoulderR);

        const armL = new THREE.Group();
        const armLMesh = this._makeBox(0.5, 1.5, 0.5, bodyColor);
        armLMesh.position.y = -0.75;
        armL.add(armLMesh);
        const clawL = this._makeBox(0.55, 0.5, 0.55, detailColor);
        clawL.position.y = -1.6;
        armL.add(clawL);
        armL.position.set(-1.3, 3.1, 0);
        armL.rotation.z = 0.2;
        group.add(armL);

        const armR = new THREE.Group();
        const armRMesh = this._makeBox(0.5, 1.5, 0.5, bodyColor);
        armRMesh.position.y = -0.75;
        armR.add(armRMesh);
        const clawR = this._makeBox(0.55, 0.5, 0.55, detailColor);
        clawR.position.y = -1.6;
        armR.add(clawR);
        armR.position.set(1.3, 3.1, 0);
        armR.rotation.z = -0.2;
        group.add(armR);

        const head = this._makeBox(1.1, 1.0, 1.0, headColor);
        head.position.y = 4.1;
        group.add(head);

        const stud = this._makeCyl(0.25, 0.25, 0.2, headColor);
        stud.position.y = 4.6;
        group.add(stud);

        const eyeL = this._makeSphere(0.18, mat('#ff0000'));
        eyeL.position.set(-0.3, 4.2, 0.5);
        const eyeR = this._makeSphere(0.18, mat('#ff0000'));
        eyeR.position.set(0.3, 4.2, 0.5);
        group.add(eyeL, eyeR);

        const hornL = this._makeCone(0.2, 0.7, detailColor);
        hornL.position.set(-0.45, 4.7, 0);
        hornL.rotation.z = 0.3;
        const hornR = this._makeCone(0.2, 0.7, detailColor);
        hornR.position.set(0.45, 4.7, 0);
        hornR.rotation.z = -0.3;
        group.add(hornL, hornR);

        const fangL = this._makeCone(0.1, 0.3, mat('#ffffff'));
        fangL.position.set(-0.2, 3.7, 0.5);
        const fangR = this._makeCone(0.1, 0.3, mat('#ffffff'));
        fangR.position.set(0.2, 3.7, 0.5);
        fangL.rotation.x = Math.PI;
        fangR.rotation.x = Math.PI;
        group.add(fangL, fangR);

        group.scale.setScalar(scale);
        group.userData = { armL, armR, head };

        return group;
    }

    static createEnemyBeetle(colors) {
        const group = new THREE.Group();
        const mat = (color) => new THREE.MeshStandardMaterial({
            color: color, roughness: 0.4, metalness: 0.1
        });

        const bodyColor = mat(colors?.body || '#2d5016');
        const detailColor = mat(colors?.detail || '#4a7c20');

        const body = this._makeBox(0.8, 0.5, 1.0, bodyColor);
        body.position.y = 0.5;
        group.add(body);

        const head = this._makeBox(0.5, 0.4, 0.4, detailColor);
        head.position.set(0, 0.5, 0.65);
        group.add(head);

        const eyeL = this._makeSphere(0.1, mat('#ff0'));
        eyeL.position.set(-0.15, 0.6, 0.85);
        const eyeR = this._makeSphere(0.1, mat('#ff0'));
        eyeR.position.set(0.15, 0.6, 0.85);
        group.add(eyeL, eyeR);

        const legPositions = [
            [-0.5, 0.25, 0.3], [0.5, 0.25, 0.3],
            [-0.5, 0.25, -0.3], [0.5, 0.25, -0.3],
            [-0.5, 0.25, 0.6], [0.5, 0.25, 0.6]
        ];
        legPositions.forEach(([x, y, z]) => {
            const leg = this._makeBox(0.15, 0.3, 0.15, detailColor);
            leg.position.set(x, y, z);
            group.add(leg);
        });

        const stud = this._makeCyl(0.08, 0.08, 0.08, bodyColor);
        stud.position.y = 0.8;
        group.add(stud);

        group.userData = {};
        return group;
    }

    static createDragon(colors) {
        const group = new THREE.Group();
        const mat = (color) => new THREE.MeshStandardMaterial({
            color: color, roughness: 0.3, metalness: 0.2
        });

        const bodyColor = mat(colors?.body || '#8b2500');
        const headColor = mat(colors?.head || '#ff4500');
        const detailColor = mat(colors?.detail || '#ffaa00');

        const body = this._makeBox(2.0, 1.5, 3.0, bodyColor);
        body.position.y = 2.5;
        group.add(body);

        const belly = this._makeBox(1.2, 0.8, 2.5, detailColor);
        belly.position.set(0, 2.2, 0.3);
        group.add(belly);

        const neck = new THREE.Group();
        const neckMesh = this._makeBox(0.8, 2.0, 0.8, bodyColor);
        neckMesh.position.y = 1.0;
        neck.add(neckMesh);
        neck.position.set(0, 3.5, 1.2);
        neck.rotation.x = -0.4;
        group.add(neck);

        const head = this._makeBox(1.0, 0.8, 1.5, headColor);
        head.position.set(0, 5.5, 2.0);
        group.add(head);

        const eyeL = this._makeSphere(0.2, mat('#ff0'));
        eyeL.position.set(-0.3, 5.7, 2.5);
        const eyeR = this._makeSphere(0.2, mat('#ff0'));
        eyeR.position.set(0.3, 5.7, 2.5);
        group.add(eyeL, eyeR);

        const hornL = this._makeCone(0.15, 0.8, detailColor);
        hornL.position.set(-0.35, 6.1, 1.8);
        hornL.rotation.z = 0.2;
        const hornR = this._makeCone(0.15, 0.8, detailColor);
        hornR.position.set(0.35, 6.1, 1.8);
        hornR.rotation.z = -0.2;
        group.add(hornL, hornR);

        const wingL = new THREE.Group();
        const wingLMesh = this._makeBox(2.5, 0.2, 2.0, detailColor);
        wingLMesh.position.set(-1.3, 0, 0);
        wingL.add(wingLMesh);
        wingL.position.set(-1.0, 3.5, 0);
        wingL.rotation.z = 0.3;
        group.add(wingL);

        const wingR = new THREE.Group();
        const wingRMesh = this._makeBox(2.5, 0.2, 2.0, detailColor);
        wingRMesh.position.set(1.3, 0, 0);
        wingR.add(wingRMesh);
        wingR.position.set(1.0, 3.5, 0);
        wingR.rotation.z = -0.3;
        group.add(wingR);

        const tail = this._makeBox(0.6, 0.6, 2.0, bodyColor);
        tail.position.set(0, 2.5, -2.5);
        group.add(tail);

        const legL = this._makeBox(0.6, 1.5, 0.6, bodyColor);
        legL.position.set(-0.7, 0.75, 0.5);
        const legR = this._makeBox(0.6, 1.5, 0.6, bodyColor);
        legR.position.set(0.7, 0.75, 0.5);
        group.add(legL, legR);

        group.userData = { wingL, wingR, neck, head };
        return group;
    }

    static createWitch(colors) {
        const group = new THREE.Group();
        const mat = (color) => new THREE.MeshStandardMaterial({
            color: color, roughness: 0.35, metalness: 0.1
        });

        const bodyColor = mat(colors?.body || '#2980b9');
        const headColor = mat(colors?.head || '#85c1e9');
        const detailColor = mat(colors?.detail || '#aed6f1');

        const robe = this._makeCone(1.2, 2.5, 8, bodyColor);
        robe.position.y = 1.25;
        group.add(robe);

        const torso = this._makeBox(0.8, 0.8, 0.5, bodyColor);
        torso.position.y = 2.5;
        group.add(torso);

        const armL = new THREE.Group();
        const armLMesh = this._makeBox(0.25, 0.7, 0.25, bodyColor);
        armLMesh.position.y = -0.35;
        armL.add(armLMesh);
        armL.position.set(-0.55, 2.8, 0);
        armL.rotation.z = 0.3;
        group.add(armL);

        const armR = new THREE.Group();
        const armRMesh = this._makeBox(0.25, 0.7, 0.25, bodyColor);
        armRMesh.position.y = -0.35;
        armR.add(armRMesh);
        armR.position.set(0.55, 2.8, 0);
        armR.rotation.z = -0.3;
        group.add(armR);

        const head = this._makeCyl(0.35, 0.35, 0.55, headColor);
        head.position.y = 3.3;
        group.add(head);

        const hat = this._makeCone(0.45, 1.2, 8, mat('#1a1a2e'));
        hat.position.y = 4.0;
        group.add(hat);

        const hatBrim = this._makeCyl(0.7, 0.7, 0.1, mat('#1a1a2e'));
        hatBrim.position.y = 3.5;
        group.add(hatBrim);

        const eyeL = this._makeSphere(0.1, mat('#00ffff'));
        eyeL.position.set(-0.12, 3.35, 0.32);
        const eyeR = this._makeSphere(0.1, mat('#00ffff'));
        eyeR.position.set(0.12, 3.35, 0.32);
        group.add(eyeL, eyeR);

        const staff = this._makeCyl(0.05, 0.05, 2.5, mat('#5d4037'));
        staff.position.set(0.8, 2.0, 0.2);
        group.add(staff);

        const staffOrb = this._makeSphere(0.2, mat('#00ffff'));
        staffOrb.position.set(0.8, 3.2, 0.2);
        group.add(staffOrb);

        group.userData = { armL, armR, staffOrb };
        return group;
    }

    static _createWeapon(weaponMat, colorHex) {
        const group = new THREE.Group();

        if (colorHex === '#ff6600' || colorHex === '#ff4500') {
            const blade1 = LegoFigure._makeBox(0.06, 0.6, 0.02, weaponMat);
            blade1.position.y = 0.3;
            group.add(blade1);
            const blade2 = LegoFigure._makeBox(0.06, 0.6, 0.02, weaponMat);
            blade2.position.set(0.15, 0, 0);
            blade2.position.y = 0.3;
            group.add(blade2);
        } else if (colorHex === '#bb8fce' || colorHex === '#7d3c98') {
            const staff = LegoFigure._makeCyl(0.04, 0.04, 1.5, weaponMat);
            staff.position.y = 0.5;
            group.add(staff);
            const orb = LegoFigure._makeSphere(0.12, weaponMat);
            orb.position.y = 1.3;
            group.add(orb);
        } else if (colorHex === '#7f8c8d' || colorHex === '#566573') {
            const handle = LegoFigure._makeCyl(0.06, 0.06, 0.6, weaponMat);
            handle.position.y = 0.1;
            group.add(handle);
            const head = LegoFigure._makeBox(0.5, 0.3, 0.3, weaponMat);
            head.position.y = 0.5;
            group.add(head);
        } else if (colorHex === '#8b0000') {
            const chain = LegoFigure._makeCyl(0.02, 0.02, 0.8, weaponMat);
            chain.position.y = 0.4;
            chain.rotation.z = Math.PI / 2;
            group.add(chain);
            const blade = LegoFigure._makeCone(0.15, 0.4, weaponMat);
            blade.position.y = 0.8;
            blade.rotation.x = Math.PI;
            group.add(blade);
        } else if (colorHex === '#b7950b' || colorHex === '#d4ac0d') {
            const shaft = LegoFigure._makeCyl(0.04, 0.04, 1.8, weaponMat);
            shaft.position.y = 0.6;
            group.add(shaft);
            const tip = LegoFigure._makeCone(0.08, 0.3, weaponMat);
            tip.position.y = 1.6;
            group.add(tip);
        } else {
            const blade = LegoFigure._makeBox(0.08, 0.7, 0.03, weaponMat);
            blade.position.y = 0.35;
            group.add(blade);
            const guard = LegoFigure._makeBox(0.25, 0.06, 0.06, weaponMat);
            guard.position.y = 0.02;
            group.add(guard);
            const handle = LegoFigure._makeCyl(0.04, 0.04, 0.2, new THREE.MeshStandardMaterial({ color: '#3d2817', roughness: 0.8 }));
            handle.position.y = -0.1;
            group.add(handle);
        }

        return group;
    }

    static _makeBox(w, h, d, mat) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    static _makeCyl(rTop, rBot, h, mat, seg = 12) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    static _makeSphere(r, mat, seg = 12) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    static _makeCone(r, h, mat, seg = 8) {
        const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
}
