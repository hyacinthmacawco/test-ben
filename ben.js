import * as THREE from "three";

/**
 * Ben's articulated cuboid model.
 * The skeleton and animation remain in main.js. Clothing graphics, hair and
 * the Omnitrix face are drawn into textures rather than built from overlays.
 */

export function createBen({ createHumanRig }) {
  if (typeof createHumanRig !== "function") {
    throw new TypeError("createBen requires the createHumanRig rig factory.");
  }

  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "Ben10CuboidCharacter";

  // Keep the skeleton, but hide its diagnostic meshes.
  group.traverse(object => {
    if (object.isMesh) object.visible = false;
  });

  const makeTexture = (width, height, draw) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    draw(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  };

  const shirtTexture = makeTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = "#101512";
    ctx.fillRect(0, 0, w, h);

    // Central green stripe, with green accents only over the shoulder seams.
    ctx.fillStyle = "#079b4b";
    ctx.fillRect(207, 0, 98, h);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(130, 0); ctx.lineTo(178, 54);
    ctx.lineTo(115, 75); ctx.lineTo(0, 43); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, 0); ctx.lineTo(w - 130, 0); ctx.lineTo(w - 178, 54);
    ctx.lineTo(w - 115, 75); ctx.lineTo(w, 43); ctx.closePath(); ctx.fill();

    // Bold, clean white 10 printed directly on the shirt.
    ctx.fillStyle = "#f1f2ec";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 150px Arial, sans-serif";
    ctx.fillText("10", w / 2, h * 0.53);
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#168c4a";
    ctx.strokeText("10", w / 2, h * 0.53);
  });

  const sleeveTexture = makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#101512";
    ctx.fillRect(0, 0, w, h);
    // Narrow green shoulder piping; most of the sleeve remains black.
    ctx.fillStyle = "#079b4b";
    ctx.fillRect(0, 0, w, 28);
    ctx.fillRect(0, 0, 24, 256);
  });

  const hairFront = makeTexture(384, 384, (ctx, w, h) => {
    ctx.fillStyle = "#c98d78";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#38231e";
    ctx.fillRect(0, 0, w, 112);
    // One simple, shallow fringe silhouette; no separate hair geometry.
    ctx.beginPath();
    ctx.moveTo(0, 82); ctx.lineTo(70, 98); ctx.lineTo(112, 135);
    ctx.lineTo(154, 102); ctx.lineTo(205, 138); ctx.lineTo(251, 100);
    ctx.lineTo(310, 126); ctx.lineTo(384, 91); ctx.lineTo(384, 0);
    ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  });

  const hairBack = makeTexture(384, 384, (ctx, w, h) => {
    ctx.fillStyle = "#c98d78";
    ctx.fillRect(0, 0, w, h);
    // Back hair covers nearly the entire rear of the head.
    ctx.fillStyle = "#38231e";
    ctx.fillRect(0, 0, w, 326);
    ctx.fillRect(0, 292, w, 34);
  });

  const hairSide = makeTexture(256, 384, (ctx, w, h) => {
    ctx.fillStyle = "#c98d78";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#38231e";
    ctx.fillRect(0, 0, w, 145);
    ctx.fillRect(0, 110, w, 90);
  });

  const hairTop = makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#38231e";
    ctx.fillRect(0, 0, w, h);
  });

  const watchFace = makeTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // Pale metallic face surround and a dark display, matching the supplied
    // Omnitrix reference. The central green hourglass is a graphic, not geometry.
    ctx.fillStyle = "#dce3dc";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#101713";
    ctx.fillRect(24, 24, 208, 208);
    ctx.fillStyle = "#079b4b";
    ctx.beginPath();
    ctx.moveTo(49, 52);
    ctx.lineTo(207, 52);
    ctx.lineTo(151, 116);
    ctx.lineTo(207, 204);
    ctx.lineTo(49, 204);
    ctx.lineTo(105, 116);
    ctx.closePath();
    ctx.fill();
    // Dark inset creates the characteristic open hourglass/waist shape.
    ctx.fillStyle = "#101713";
    ctx.beginPath();
    ctx.moveTo(91, 83);
    ctx.lineTo(165, 83);
    ctx.lineTo(132, 116);
    ctx.lineTo(165, 173);
    ctx.lineTo(91, 173);
    ctx.lineTo(124, 116);
    ctx.closePath();
    ctx.fill();
  });

  const mat = {
    skin: new THREE.MeshStandardMaterial({ color: 0xc98d78, roughness: 0.92 }),
    hairFront: new THREE.MeshStandardMaterial({ map: hairFront, roughness: 0.96 }),
    hairBack: new THREE.MeshStandardMaterial({ map: hairBack, roughness: 0.96 }),
    hairSide: new THREE.MeshStandardMaterial({ map: hairSide, roughness: 0.96 }),
    hairTop: new THREE.MeshStandardMaterial({ map: hairTop, roughness: 0.96 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xffffff, map: shirtTexture, roughness: 0.9 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0xffffff, map: sleeveTexture, roughness: 0.9 }),
    black: new THREE.MeshStandardMaterial({ color: 0x101512, roughness: 0.9 }),
    green: new THREE.MeshStandardMaterial({ color: 0x079b4b, roughness: 0.86 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x70452f, roughness: 0.96 }),
    pantsDark: new THREE.MeshStandardMaterial({ color: 0x593522, roughness: 0.96 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe7e9e2, roughness: 0.86 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x252a29, roughness: 0.94 }),
    watchGreen: new THREE.MeshStandardMaterial({ color: 0x078b43, roughness: 0.62 }),
    watchFace: new THREE.MeshStandardMaterial({
      map: watchFace, transparent: true, roughness: 0.48, metalness: 0.08
    })
  };

  const box = (parent, name, size, position, material) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      material
    );
    mesh.name = name;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Shirt extends down over the pelvis. The waistband is parented to the
  // spine, not the independently rotating hip, so the two cannot pull apart.
  const torso = box(joints.spine, "BenShirt", [0.45, 0.72, 0.28],
    [0, 0.15, 0], [
      mat.black, mat.black, mat.black, mat.black, mat.shirt, mat.black
    ]);
  rig.fitToTorso(torso);

  box(joints.spine, "BenTrouserWaist", [0.38, 0.34, 0.255],
    [0, -0.10, 0], mat.pants);

  // No neck mesh: the head remains attached directly to the neck bone.
  // Hair is painted onto the cuboid head's faces.
  const headMesh = box(joints.head, "BenHead", [0.37, 0.42, 0.32],
    [0, 0.055, 0], [
      mat.hairSide, mat.hairSide, mat.hairTop, mat.skin,
      mat.hairFront, mat.hairBack
    ]);
  rig.fitHeadToTorso(torso, headMesh);

  // Sleeves are black with narrow green texture accents, matching Ben's shirt.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = joints[side + "Shoulder"];
    const elbow = joints[side + "Elbow"];
    const wrist = joints[side + "Wrist"];

    // Upper sleeve overlaps the clavicle end and the forearm slightly.
    box(shoulder, side + "BlackSleeve", [Math.abs(elbow.position.x) + 0.035, 0.22, 0.265],
      [elbow.position.x * 0.5, elbow.position.y * 0.5, 0], [
        mat.black, mat.black, mat.sleeve, mat.black, mat.black, mat.black
      ]);

    // Forearm and hand are centered on the actual elbow-to-wrist span.
    box(elbow, side + "SkinForearm", [Math.abs(wrist.position.x) + 0.035, 0.155, 0.175],
      [wrist.position.x * 0.5, wrist.position.y * 0.5, 0], mat.skin);
    box(wrist, side + "SkinHand", [0.155, 0.145, 0.17],
      [sign * 0.075, 0, 0], mat.skin);
  }

  // Articulated trouser legs and simple white trainers.
  for (const side of ["left", "right"]) {
    const thigh = joints[side + "Thigh"];
    const knee = joints[side + "Knee"];
    const ankle = joints[side + "Ankle"];

    // Extend the upper trouser panel above the thigh pivot so it physically
    // overlaps the waistband/pelvis. Keep its lower edge at the original
    // position so the knee seam and lower-leg proportions do not change.
    box(thigh, side + "UpperTrouser", [0.205, 0.62, 0.215],
      [0, -0.30, 0], mat.pants);
    box(knee, side + "LowerTrouser", [0.17, 0.44, 0.20],
      [0, -0.215, 0], mat.pantsDark);

    box(ankle, side + "WhiteTrainer", [0.205, 0.15, 0.31],
      [0, -0.065, 0.085], mat.white);
    box(ankle, side + "TrainerSole", [0.21, 0.045, 0.315],
      [0, -0.145, 0.085], mat.sole);
    box(ankle, side + "TrainerGreenToe", [0.13, 0.025, 0.035],
      [0, -0.035, 0.235], mat.green);
  }

  // Omnitrix strap wraps around the wrist on all four sides; the watch
  // housing sits over the dorsal strap while the rear band remains visible.
  const watch = new THREE.Group();
  watch.name = "Omnitrix";
  watch.position.set(-0.005, 0.005, 0.085);
  joints.leftWrist.add(watch);
  const strap = new THREE.MeshStandardMaterial({ color: 0x17251d, roughness: 0.86 });
  box(watch, "OmnitrixStrapTop", [0.19, 0.025, 0.19], [0, 0.082, -0.005], strap);
  box(watch, "OmnitrixStrapBottom", [0.19, 0.025, 0.19], [0, -0.082, -0.005], strap);
  box(watch, "OmnitrixStrapBack", [0.19, 0.14, 0.025], [0, 0, -0.092], strap);
  box(watch, "OmnitrixStrapFrontSides", [0.19, 0.14, 0.025], [0, 0, 0.082], strap);
  box(watch, "OmnitrixBody", [0.15, 0.17, 0.105], [0, 0, 0.105], mat.watchGreen);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.132, 0.132),
    mat.watchFace
  );
  face.name = "OmnitrixTexturedFaceplate";
  face.position.z = 0.1585;
  face.castShadow = false;
  watch.add(face);

  return { group, rig, joints };
}
