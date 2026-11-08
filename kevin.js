import * as THREE from "three";

export function createKevin({ createHumanRig }) {
  if (typeof createHumanRig !== "function") throw new TypeError("createKevin requires createHumanRig.");
  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "KevinLevin";
  group.traverse(o => { if (o.isMesh) o.visible = false; });

  const mat = {
    skin: new THREE.MeshStandardMaterial({ color: 0xd0a18d, roughness: 0.92 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x17151b, roughness: 0.95 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.92 }),
    shirtBlue: new THREE.MeshStandardMaterial({ color: 0x263e56, roughness: 0.9 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x77786e, roughness: 0.94 }),
    sleeveDark: new THREE.MeshStandardMaterial({ color: 0x45483f, roughness: 0.94 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x17233b, roughness: 0.94 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x303b42, roughness: 0.82 })
  };
  const hairMap = mat.hair;
  const faceMaterial = mat.skin;
  const shirtCanvas = document.createElement("canvas");
  shirtCanvas.width = 512; shirtCanvas.height = 640;
  const shirtCtx = shirtCanvas.getContext("2d");
  shirtCtx.fillStyle = "#10131a"; shirtCtx.fillRect(0, 0, 512, 640);
  // Blue harness straps are part of the shirt artwork, not floating geometry.
  shirtCtx.fillStyle = "#263e56";
  shirtCtx.beginPath(); shirtCtx.moveTo(72, 0); shirtCtx.lineTo(142, 0);
  shirtCtx.lineTo(265, 640); shirtCtx.lineTo(195, 640); shirtCtx.closePath(); shirtCtx.fill();
  shirtCtx.beginPath(); shirtCtx.moveTo(370, 0); shirtCtx.lineTo(440, 0);
  shirtCtx.lineTo(317, 640); shirtCtx.lineTo(247, 640); shirtCtx.closePath(); shirtCtx.fill();
  const shirtTexture = new THREE.CanvasTexture(shirtCanvas);
  shirtTexture.colorSpace = THREE.SRGBColorSpace;
  shirtTexture.anisotropy = 4;
  const shirtFront = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shirtTexture, roughness: 0.92 });
  const box = (p, n, s, pos, m) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(...s), m);
    o.name = n; o.position.set(...pos); o.castShadow = true; o.receiveShadow = true; p.add(o); return o;
  };

  const torso = box(joints.spine, "KevinBlackShirt", [0.49, 0.73, 0.30], [0, 0.15, 0],
    [mat.shirt, mat.shirt, mat.shirt, mat.shirt, shirtFront, mat.shirt]);
  rig.fitToTorso(torso);
  box(joints.spine, "KevinNeckBand", [0.30, 0.11, 0.30], [0, 0.49, 0], mat.sleeveDark);
  // Hair is a surface texture on the scalp/head mesh, not separate blocks.
  const headMesh = box(joints.head, "KevinHead", [0.37, 0.43, 0.32], [0, 0.055, 0],
    [hairMap, hairMap, hairMap, faceMaterial, faceMaterial, hairMap]);
  rig.fitHeadToTorso(torso, headMesh);

  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = joints[side + "Shoulder"];
    const elbow = joints[side + "Elbow"];
    const wrist = joints[side + "Wrist"];
    box(shoulder, "KevinGrayShoulderArmor", [Math.abs(elbow.position.x) + 0.06, 0.24, 0.30],
      [elbow.position.x * 0.5, elbow.position.y * 0.5, 0], mat.sleeve);
    box(shoulder, "KevinShoulderBand", [Math.abs(elbow.position.x) + 0.045, 0.065, 0.31],
      [elbow.position.x * 0.5, 0.075, 0], mat.sleeveDark);
    box(elbow, "KevinGrayForearm", [Math.abs(wrist.position.x) + 0.045, 0.17, 0.19],
      [wrist.position.x * 0.5, wrist.position.y * 0.5, 0], mat.sleeve);
    box(elbow, "KevinForearmBand", [Math.abs(wrist.position.x) + 0.04, 0.055, 0.20],
      [wrist.position.x * 0.5, -0.055, 0], mat.sleeveDark);
    box(joints[side + "Wrist"], "KevinHand", [0.15, 0.14, 0.16], [sign * 0.075, 0, 0], mat.skin);
    box(joints[side + "Thigh"], "KevinJeans", [0.21, 0.62, 0.22], [0, -0.30, 0], mat.pants);
    box(joints[side + "Knee"], "KevinLowerJeans", [0.18, 0.44, 0.20], [0, -0.21, 0], mat.pants);
    box(joints[side + "Ankle"], "KevinBoot", [0.21, 0.16, 0.31], [0, -0.08, 0.07], mat.shirt);
  }
  return { group, rig, joints };
}
