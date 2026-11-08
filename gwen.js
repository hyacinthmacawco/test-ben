import * as THREE from "three";

export function createGwen({ createHumanRig }) {
  if (typeof createHumanRig !== "function") throw new TypeError("createGwen requires createHumanRig.");
  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "GwenTennyson";
  group.traverse(o => { if (o.isMesh) o.visible = false; });

  const mat = {
    skin: new THREE.MeshStandardMaterial({ color: 0xe5b3a4, roughness: 0.9 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x8ec9e8, roughness: 0.92 }),
    shirtDark: new THREE.MeshStandardMaterial({ color: 0x4d83a8, roughness: 0.9 }),
    skirt: new THREE.MeshStandardMaterial({ color: 0x244c83, roughness: 0.92 }),
    skirtLine: new THREE.MeshStandardMaterial({ color: 0x91b7d3, roughness: 0.9 }),
    hair: new THREE.MeshStandardMaterial({ color: 0xd95b20, roughness: 0.95 }),
    hairLight: new THREE.MeshStandardMaterial({ color: 0xf0782b, roughness: 0.95 }),
    boot: new THREE.MeshStandardMaterial({ color: 0xdce7e9, roughness: 0.9 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x31577a, roughness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x173c67, roughness: 0.55, metalness: 0.12 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x4e9db9, roughness: 0.35, metalness: 0.15 })
  };
  const makeTexture = (draw) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 640;
    const ctx = canvas.getContext("2d");
    draw(ctx, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  };
  const topTexture = makeTexture((ctx, w, h) => {
    ctx.fillStyle = "#8ec9e8"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#4d83a8";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(130, 0); ctx.lineTo(180, 72);
    ctx.lineTo(332, 72); ctx.lineTo(382, 0); ctx.lineTo(w, 0);
    ctx.lineTo(w, 90); ctx.lineTo(340, 128); ctx.lineTo(172, 128);
    ctx.lineTo(0, 90); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d4e9f2";
    ctx.beginPath(); ctx.moveTo(256, 220); ctx.lineTo(310, 270); ctx.lineTo(256, 320);
    ctx.lineTo(202, 270); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#4d83a8";
    ctx.beginPath(); ctx.moveTo(256, 238); ctx.lineTo(290, 270); ctx.lineTo(256, 302);
    ctx.lineTo(222, 270); ctx.closePath(); ctx.fill();
  });
  const topFront = new THREE.MeshStandardMaterial({ color: 0xffffff, map: topTexture, roughness: 0.92 });
  const hairMat = mat.hair;
  const skinFaceMat = mat.skin;
  const plaidTexture = makeTexture((ctx, w, h) => {
    ctx.fillStyle = "#244c83"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8fb7d5"; ctx.lineWidth = 5;
    for (let x = 0; x <= w; x += 72) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 72) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    ctx.strokeStyle = "#4775a8"; ctx.lineWidth = 2;
    for (let x = 36; x <= w; x += 72) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  });
  const plaidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plaidTexture, roughness: 0.92 });
  const box = (p, n, s, pos, m) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(...s), m);
    o.name = n; o.position.set(...pos); o.castShadow = true; o.receiveShadow = true; p.add(o); return o;
  };
  const cylinder = (p, n, r1, r2, h, pos, m, segments = 8) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments), m);
    o.name = n; o.position.set(...pos); o.castShadow = true; p.add(o); return o;
  };

  // Shirt graphic is painted into the front-face texture.
  const torso = box(joints.spine, "GwenBlueTop", [0.47, 0.65, 0.29], [0, 0.16, 0],
    [mat.shirt, mat.shirt, mat.shirt, mat.shirt, topFront, mat.shirt]);
  rig.fitToTorso(torso);
  box(joints.spine, "GwenCollar", [0.22, 0.055, 0.30], [0, 0.475, 0], mat.shirtDark);
  box(joints.spine, "GwenChestEmblem", [0.19, 0.13, 0.012], [0, 0.25, 0.151], mat.shirtDark);
  // Plaid skirt pattern is applied directly to the upper-leg surfaces; no
  // separate skirt or hip cuboid is added to the silhouette.

  // Plain orange hair: a shaped front fringe and long side panels give
  // Gwen a recognizable bob silhouette without using hair textures.
  const headMesh = box(joints.head, "GwenHead", [0.37, 0.42, 0.32], [0, 0.055, 0],
    [hairMat, hairMat, hairMat, skinFaceMat, skinFaceMat, hairMat]);
  rig.fitHeadToTorso(torso, headMesh);

  const fringeShape = new THREE.Shape();
  fringeShape.moveTo(-0.185, 0.265);
  fringeShape.lineTo(0.185, 0.265);
  fringeShape.lineTo(0.185, 0.155);
  fringeShape.lineTo(0.115, 0.135);
  fringeShape.lineTo(0.055, 0.165);
  fringeShape.lineTo(-0.005, 0.125);
  fringeShape.lineTo(-0.075, 0.16);
  fringeShape.lineTo(-0.135, 0.13);
  fringeShape.lineTo(-0.185, 0.16);
  fringeShape.closePath();
  const fringe = new THREE.Mesh(new THREE.ShapeGeometry(fringeShape), mat.hair);
  fringe.name = "GwenFrontFringe";
  fringe.position.z = 0.166;
  fringe.castShadow = true;
  joints.head.add(fringe);

  for (const sign of [-1, 1]) {
    const sideLock = box(joints.head, "GwenLongSideHair", [0.105, 0.48, 0.335],
      [sign * 0.175, -0.105, -0.005], mat.hair);
    sideLock.rotation.z = -sign * 0.035;
    box(joints.head, "GwenBobEnd", [0.11, 0.09, 0.34],
      [sign * 0.175, -0.365, -0.005], mat.hair);
  }

  // Keep only the spectacle frames and lenses; lower them clear of the fringe.
  for (const sign of [-1, 1]) {
    box(joints.head, "GwenSpectacleLens", [0.145, 0.095, 0.018], [sign * 0.088, -0.005, 0.178], mat.lens);
    box(joints.head, "GwenSpectacleTop", [0.16, 0.014, 0.025], [sign * 0.088, 0.05, 0.18], mat.frame);
    box(joints.head, "GwenSpectacleBottom", [0.16, 0.014, 0.025], [sign * 0.088, -0.06, 0.18], mat.frame);
    box(joints.head, "GwenSpectacleOuter", [0.014, 0.11, 0.025], [sign * 0.166, -0.005, 0.18], mat.frame);
    box(joints.head, "GwenSpectacleInner", [0.014, 0.11, 0.025], [sign * 0.01, -0.005, 0.18], mat.frame);
  }

  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = joints[side + "Shoulder"];
    const elbow = joints[side + "Elbow"];
    const wrist = joints[side + "Wrist"];
    box(shoulder, "GwenShortSleeve", [Math.abs(elbow.position.x) + 0.035, 0.19, 0.27],
      [elbow.position.x * 0.5, elbow.position.y * 0.5, 0], mat.shirt);
    box(elbow, "GwenForearm", [Math.abs(wrist.position.x) + 0.035, 0.14, 0.16],
      [wrist.position.x * 0.5, wrist.position.y * 0.5, 0], mat.skin);
    box(joints[side + "Wrist"], "GwenHand", [0.15, 0.14, 0.16], [sign * 0.075, 0, 0], mat.skin);
    box(joints[side + "Thigh"], "GwenPlaidSkirtLegTexture", [0.235, 0.53, 0.235], [0, -0.245, 0], plaidMat);
    box(joints[side + "Knee"], "GwenLowerLeg", [0.16, 0.44, 0.18], [0, -0.21, 0], mat.skin);
    box(joints[side + "Knee"], "GwenPlaidBelowKnee", [0.235, 0.12, 0.235], [0, 0.015, 0], plaidMat);
    box(joints[side + "Ankle"], "GwenWhiteBoot", [0.20, 0.42, 0.25], [0, -0.17, 0.015], mat.boot);
    box(joints[side + "Ankle"], "GwenBootSole", [0.22, 0.045, 0.30], [0, -0.39, 0.07], mat.sole);
  }
  return { group, rig, joints };
}
