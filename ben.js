import * as THREE from "three";

/**
 * Build a stylized, game-ready Ben model and attach its visible parts to the
 * procedural humanoid rig. All limbs are children of their matching joints,
 * so the existing shoulder, elbow, hip and knee animation drives the model.
 */
export function createBen({ createHumanRig }) {
  if (typeof createHumanRig !== "function") {
    throw new TypeError("createBen requires the createHumanRig rig factory.");
  }

  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "Ben10Character";

  // Hide the rig's diagnostic cylinders and joint markers; retain the bones.
  group.traverse(object => {
    if (object.isMesh) object.visible = false;
  });

  const materials = {
    skin: new THREE.MeshStandardMaterial({ color: 0xd99a82, roughness: 0.88 }),
    skinLight: new THREE.MeshStandardMaterial({ color: 0xe9b09a, roughness: 0.9 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x38231d, roughness: 0.95 }),
    hairLight: new THREE.MeshStandardMaterial({ color: 0x543025, roughness: 0.95 }),
    green: new THREE.MeshStandardMaterial({ color: 0x079b4c, roughness: 0.82 }),
    shoeWhite: new THREE.MeshStandardMaterial({ color: 0xe5e8df, roughness: 0.8 }),
    shoeGreen: new THREE.MeshStandardMaterial({ color: 0x078c48, roughness: 0.82 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x252a28, roughness: 0.95 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xf4eee3, roughness: 0.65 }),
    iris: new THREE.MeshStandardMaterial({ color: 0x159b50, roughness: 0.55 }),
    outline: new THREE.MeshStandardMaterial({ color: 0x241914, roughness: 1 })
  };

  const add = (parent, geometry, material, position, scale, name) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (name) mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const sphere = (parent, material, position, scale, name) =>
    add(parent, new THREE.SphereGeometry(1, 24, 18), material, position, scale, name);

  const capsule = (parent, material, start, end, radius, name) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a);
    const length = delta.length();
    const mesh = add(
      parent,
      new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 0.25), 5, 12),
      material,
      a.clone().add(b).multiplyScalar(0.5).toArray(),
      null,
      name
    );
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  };

  // Rounded lofts create tapered, continuous-looking forms instead of
  // straight capsules with abrupt intersections at the joints.
  const loftAlongX = (parent, material, length, startRadius, endRadius, sign, name) => {
    const half = length * 0.5;
    const r0 = startRadius;
    const r1 = endRadius;
    const profile = [
      new THREE.Vector2(r0 * 0.68, -half),
      new THREE.Vector2(r0 * 0.92, -half + 0.018),
      new THREE.Vector2(r0, -half + 0.055),
      new THREE.Vector2(r0 * 0.98 + r1 * 0.02, -half * 0.18),
      new THREE.Vector2(r0 * 0.25 + r1 * 0.75, half * 0.18),
      new THREE.Vector2(r1, half - 0.055),
      new THREE.Vector2(r1 * 0.92, half - 0.018),
      new THREE.Vector2(r1 * 0.68, half)
    ];
    const geometry = new THREE.LatheGeometry(profile, 40);
    geometry.computeVertexNormals();
    const mesh = add(parent, geometry, material,
      [sign * half, 0, 0], null, name);
    mesh.rotation.z = -sign * Math.PI / 2;
    return mesh;
  };

  // Build the torso, pelvis, neck and all four limb sections as one
  // smooth implicit surface, then bind its vertices to the existing rig.
  // This is a real SkinnedMesh: the surface is continuous at rest and deforms
  // with shoulder, elbow, hip and knee bones during the walk cycle.
  const buildContinuousBody = () => {
    group.updateMatrixWorld(true);
    const primitives = [];
    const addEllipsoid = (center, radii, region) =>
      primitives.push({ type: "ellipsoid", center: new THREE.Vector3(...center),
        radii: new THREE.Vector3(...radii), region });
    const addCapsule = (a, b, radius, region) =>
      primitives.push({ type: "capsule", a: new THREE.Vector3(...a),
        b: new THREE.Vector3(...b), radius, region });

    const worldPoint = bone => {
      const p = new THREE.Vector3();
      bone.getWorldPosition(p);
      return p.toArray();
    };
    const pHip = worldPoint(joints.hip);
    const pSpine = worldPoint(joints.spine);
    const pNeck = worldPoint(joints.neck);

    addEllipsoid([0, 1.37, 0], [0.285, 0.455, 0.19], "shirt");
    addEllipsoid([0, 1.01, 0], [0.195, 0.255, 0.16], "pants");
    addEllipsoid([0, 1.70, 0], [0.105, 0.18, 0.105], "skin");

    for (const side of ["left", "right"]) {
      const shoulder = joints[side + "Shoulder"];
      const elbow = joints[side + "Elbow"];
      const wrist = joints[side + "Wrist"];
      addCapsule(worldPoint(shoulder), worldPoint(elbow), 0.079, "skin");
      addCapsule(worldPoint(shoulder), worldPoint(elbow), 0.112, "sleeve");
      addCapsule(worldPoint(elbow), worldPoint(wrist), 0.067, "skin");

      const thigh = joints[side + "Thigh"];
      const knee = joints[side + "Knee"];
      const ankle = joints[side + "Ankle"];
      const thighEnd = new THREE.Vector3(...worldPoint(knee));
      const anklePoint = new THREE.Vector3(...worldPoint(ankle));
      // Narrow each trouser leg so the two legs remain visibly distinct.
      addCapsule(worldPoint(thigh), thighEnd.toArray(), 0.092, "pants");
      // Stop the trouser hem above the shoe and expose a short skin ankle.
      const hemPoint = anklePoint.clone().add(new THREE.Vector3(0, 0.13, 0));
      addCapsule(thighEnd.toArray(), hemPoint.toArray(), 0.082, "pants");
      addCapsule(hemPoint.toArray(), anklePoint.toArray(), 0.052, "skin");
    }

    const smoothMin = (a, b, k) => {
      const h = Math.max(k - Math.abs(a - b), 0) / k;
      return Math.min(a, b) - h * h * k * 0.25;
    };
    const primitiveDistance = (p, primitive) => {
      if (primitive.type === "ellipsoid") {
        const q = new THREE.Vector3(
          (p.x - primitive.center.x) / primitive.radii.x,
          (p.y - primitive.center.y) / primitive.radii.y,
          (p.z - primitive.center.z) / primitive.radii.z
        );
        const k0 = q.length();
        const k1 = new THREE.Vector3(
          q.x / primitive.radii.x,
          q.y / primitive.radii.y,
          q.z / primitive.radii.z
        ).length();
        return k0 * (k0 - 1) / Math.max(k1, 1e-5);
      }
      const ab = primitive.b.clone().sub(primitive.a);
      const t = THREE.MathUtils.clamp(
        p.clone().sub(primitive.a).dot(ab) / Math.max(ab.lengthSq(), 1e-8), 0, 1
      );
      return p.distanceTo(primitive.a.clone().addScaledVector(ab, t)) - primitive.radius;
    };
    const sample = p => {
      let distance = Infinity;
      let region = "skin";
      for (const primitive of primitives) {
        const d = primitiveDistance(p, primitive);
        if (d < distance) region = primitive.region;
        distance = smoothMin(distance, d, 0.075);
      }
      return { distance, region };
    };

    // Marching tetrahedra turns the smooth-union field into a single indexed
    // triangle surface. A moderate grid keeps load time and mobile performance
    // reasonable while providing enough vertices for smooth joint deformation.
    const bounds = { minX: -0.58, maxX: 0.58, minY: 0.34, maxY: 1.91,
      minZ: -0.31, maxZ: 0.31 };
    const step = 0.035;
    const nx = Math.ceil((bounds.maxX - bounds.minX) / step);
    const ny = Math.ceil((bounds.maxY - bounds.minY) / step);
    const nz = Math.ceil((bounds.maxZ - bounds.minZ) / step);
    const values = new Float32Array((nx + 1) * (ny + 1) * (nz + 1));
    const regions = new Uint8Array(values.length);
    const index = (x, y, z) => (z * (ny + 1) + y) * (nx + 1) + x;
    const regionId = { skin: 0, shirt: 1, sleeve: 1, pants: 2 };
    const pointAt = (x, y, z) => new THREE.Vector3(
      bounds.minX + x * step, bounds.minY + y * step, bounds.minZ + z * step
    );

    for (let z = 0; z <= nz; z++) for (let y = 0; y <= ny; y++)
      for (let x = 0; x <= nx; x++) {
        const id = index(x, y, z);
        const result = sample(pointAt(x, y, z));
        values[id] = result.distance;
        regions[id] = regionId[result.region] ?? 0;
      }

    const positions = [];
    const colors = [];
    const skinIndices = [];
    const skinWeights = [];
    const indices = [];
    const edgeCache = new Map();
    const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6],
      [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
    const cubeCorners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],
      [0,0,1],[1,0,1],[1,1,1],[0,1,1]];
    const boneSegments = [];
    const addBoneSegment = (name, childName) => {
      const bone = joints[name];
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      bone.getWorldPosition(a);
      joints[childName].getWorldPosition(b);
      const boneIndex = rig.bones.indexOf(bone);
      boneSegments.push({ a, b, boneIndex });
    };
    addBoneSegment("hip", "spine");
    addBoneSegment("spine", "neck");
    for (const side of ["left", "right"]) {
      addBoneSegment(side + "Shoulder", side + "Elbow");
      addBoneSegment(side + "Elbow", side + "Wrist");
      addBoneSegment(side + "Thigh", side + "Knee");
      addBoneSegment(side + "Knee", side + "Ankle");
    }

    const appendVertex = p => {
      const primitiveResult = sample(p);
      const region = primitiveResult.region;
      let color;
      if (region === "shirt") color = new THREE.Color(0x111714);
      else if (region === "sleeve") color = new THREE.Color(0x079b4c);
      else if (region === "pants") color = new THREE.Color(0x704329);
      else color = new THREE.Color(0xd99a82);

      // Paint the central green shirt stripe directly into vertex colors.
      if (region === "shirt" && p.z > 0.105 && Math.abs(p.x) < 0.062 &&
          p.y > 1.08 && p.y < 1.78) color.setHex(0x079b4c);
      positions.push(p.x, p.y, p.z);
      colors.push(color.r, color.g, color.b);

      const nearest = boneSegments.map(segment => {
        const ab = segment.b.clone().sub(segment.a);
        const t = THREE.MathUtils.clamp(
          p.clone().sub(segment.a).dot(ab) / Math.max(ab.lengthSq(), 1e-8), 0, 1
        );
        return { index: segment.boneIndex,
          distance: p.distanceTo(segment.a.clone().addScaledVector(ab, t)) };
      }).sort((a, b) => a.distance - b.distance).slice(0, 4);
      const weights = nearest.map(item => 1 / Math.pow(item.distance + 0.045, 3));
      const total = weights.reduce((sum, value) => sum + value, 0);
      const ids = [0, 0, 0, 0], ws = [0, 0, 0, 0];
      nearest.forEach((item, i) => {
        ids[i] = item.index;
        ws[i] = weights[i] / total;
      });
      skinIndices.push(...ids);
      skinWeights.push(...ws);
      return positions.length / 3 - 1;
    };

    const edgeVertex = (a, b, pa, pb, da, db) => {
      const key = a < b ? a + ":" + b : b + ":" + a;
      if (edgeCache.has(key)) return edgeCache.get(key);
      const t = da / (da - db);
      const p = pa.clone().lerp(pb, t);
      const id = appendVertex(p);
      edgeCache.set(key, id);
      return id;
    };
    const emitTriangle = (a, b, c) => {
      indices.push(a, b, c);
    };

    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        const cornerIds = cubeCorners.map(([dx,dy,dz]) => index(x+dx,y+dy,z+dz));
        const cornerPoints = cubeCorners.map(([dx,dy,dz]) => pointAt(x+dx,y+dy,z+dz));
        const cornerValues = cornerIds.map(id => values[id]);
        if (cornerValues.every(v => v >= 0) || cornerValues.every(v => v < 0)) continue;

        for (const tet of tetrahedra) {
          const inside = tet.filter(i => cornerValues[i] < 0);
          const outside = tet.filter(i => cornerValues[i] >= 0);
          if (!inside.length || !outside.length) continue;
          const cross = (i, j) => edgeVertex(cornerIds[i], cornerIds[j],
            cornerPoints[i], cornerPoints[j], cornerValues[i], cornerValues[j]);
          if (inside.length === 1) {
            emitTriangle(cross(inside[0],outside[0]), cross(inside[0],outside[1]),
              cross(inside[0],outside[2]));
          } else if (inside.length === 3) {
            emitTriangle(cross(outside[0],inside[0]), cross(outside[0],inside[2]),
              cross(outside[0],inside[1]));
          } else {
            const a = cross(inside[0],outside[0]);
            const b = cross(inside[0],outside[1]);
            const c = cross(inside[1],outside[0]);
            const d = cross(inside[1],outside[1]);
            emitTriangle(a, b, c);
            emitTriangle(b, d, c);
          }
        }
      }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
    geometry.setIndex(indices);
    // Derive smooth normals from the continuous distance field rather than
    // averaging triangle faces. This avoids the faceted, bark-like shading
    // caused by tetrahedron winding differences.
    const normalValues = [];
    const normalStep = 0.008;
    for (let i = 0; i < positions.length; i += 3) {
      const p = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const nx = sample(p.clone().add(new THREE.Vector3(normalStep, 0, 0))).distance -
        sample(p.clone().sub(new THREE.Vector3(normalStep, 0, 0))).distance;
      const ny = sample(p.clone().add(new THREE.Vector3(0, normalStep, 0))).distance -
        sample(p.clone().sub(new THREE.Vector3(0, normalStep, 0))).distance;
      const nz = sample(p.clone().add(new THREE.Vector3(0, 0, normalStep))).distance -
        sample(p.clone().sub(new THREE.Vector3(0, 0, normalStep))).distance;
      const normal = new THREE.Vector3(nx, ny, nz).normalize();
      normalValues.push(normal.x, normal.y, normal.z);
    }
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normalValues, 3));
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.96, metalness: 0,
      side: THREE.DoubleSide, flatShading: false
    });
    const body = new THREE.SkinnedMesh(geometry, material);
    body.name = "BenContinuousSkinnedBody";
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    group.updateMatrixWorld(true);
    body.bind(rig.skeleton);
    body.normalizeSkinWeights();
    return body;
  };

  const continuousBody = buildContinuousBody();

  // The "10" is a flat shirt print, not a floating 3D object.
  const numberCanvas = document.createElement("canvas");
  numberCanvas.width = 256;
  numberCanvas.height = 192;
  const numberContext = numberCanvas.getContext("2d");
  numberContext.clearRect(0, 0, 256, 192);
  numberContext.textAlign = "center";
  numberContext.textBaseline = "middle";
  numberContext.font = "900 132px Arial, sans-serif";
  numberContext.lineJoin = "round";
  numberContext.lineWidth = 18;
  numberContext.strokeStyle = "#123d28";
  numberContext.strokeText("10", 128, 98);
  numberContext.lineWidth = 8;
  numberContext.strokeStyle = "#159b50";
  numberContext.strokeText("10", 128, 98);
  numberContext.fillStyle = "#ffffff";
  numberContext.fillText("10", 128, 98);
  const numberTexture = new THREE.CanvasTexture(numberCanvas);
  numberTexture.colorSpace = THREE.SRGBColorSpace;
  const numberMaterial = new THREE.MeshBasicMaterial({
    map: numberTexture, transparent: true, depthWrite: false,
    side: THREE.DoubleSide
  });
  const numberPrint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.19, 0.145), numberMaterial
  );
  numberPrint.name = "Ben10ShirtPrint";
  numberPrint.position.set(0, 1.39, 0.198);
  group.add(numberPrint);

  // Neck and head.
  const head = joints.head;
  sphere(head, materials.skin, [0, 0.075, 0.015], [0.225, 0.285, 0.19], "BenHead");
  // A single curved face decal carries the eyes, brows and mouth as pixels.
  // Its vertices follow the ellipsoid head surface, avoiding floating feature meshes.
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 512;
  faceCanvas.height = 512;
  const faceCtx = faceCanvas.getContext("2d");
  faceCtx.clearRect(0, 0, 512, 512);

  // Larger almond-shaped eyes with white sclera and green irises only.
  // Ben's design has no black pupils; the green iris remains the focal point.
  for (const x of [174, 338]) {
    faceCtx.fillStyle = "#f4eee3";
    faceCtx.beginPath();
    faceCtx.moveTo(x - 57, 226);
    faceCtx.quadraticCurveTo(x - 43, 184, x, 190);
    faceCtx.quadraticCurveTo(x + 43, 184, x + 57, 226);
    faceCtx.quadraticCurveTo(x + 34, 260, x, 258);
    faceCtx.quadraticCurveTo(x - 34, 260, x - 57, 226);
    faceCtx.closePath();
    faceCtx.fill();

    faceCtx.fillStyle = "#159b50";
    faceCtx.beginPath();
    faceCtx.ellipse(x + 2, 225, 25, 31, 0, 0, Math.PI * 2);
    faceCtx.fill();
    // A restrained darker green rim gives the iris definition without a pupil.
    faceCtx.strokeStyle = "#08763b";
    faceCtx.lineWidth = 4;
    faceCtx.stroke();
  }

  // Broader, gently angled brows with proportions closer to the reference.
  faceCtx.strokeStyle = "#38231d";
  faceCtx.lineWidth = 20;
  faceCtx.lineCap = "round";
  faceCtx.beginPath();
  faceCtx.moveTo(111, 164);
  faceCtx.quadraticCurveTo(164, 140, 218, 160);
  faceCtx.moveTo(294, 160);
  faceCtx.quadraticCurveTo(348, 140, 401, 164);
  faceCtx.stroke();

  // Wider, shallow smile; keep the line subtle rather than cartoonishly thick.
  faceCtx.strokeStyle = "#241914";
  faceCtx.lineWidth = 7;
  faceCtx.lineCap = "round";
  faceCtx.beginPath();
  faceCtx.moveTo(151, 350);
  faceCtx.quadraticCurveTo(256, 392, 361, 350);
  faceCtx.stroke();

  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.needsUpdate = true;

  const facePositions = [];
  const faceUvs = [];
  const faceIndices = [];
  const cols = 32;
  const rows = 32;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    const y = 0.235 - v * 0.34;
    for (let col = 0; col <= cols; col++) {
      const u = col / cols;
      const x = (u - 0.5) * 0.39;
      const nx = x / 0.225;
      const ny = (y - 0.075) / 0.285;
      const depth = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny));
      const z = 0.015 + 0.19 * depth + 0.002;
      facePositions.push(x, y, z);
      faceUvs.push(u, 1 - v);
      if (row < rows && col < cols) {
        const a = row * (cols + 1) + col;
        const b = a + cols + 1;
        faceIndices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const faceGeometry = new THREE.BufferGeometry();
  faceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(facePositions, 3));
  faceGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(faceUvs, 2));
  faceGeometry.setIndex(faceIndices);
  faceGeometry.computeVertexNormals();
  const face = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
    map: faceTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide
  }));
  face.name = "BenFaceTexture";
  head.add(face);

  // The nose remains a small sculpted form; eyes, brows and mouth are texture artwork.
  sphere(head, materials.skinLight, [0, 0.025, 0.218], [0.022, 0.038, 0.027], "Nose");

  // Ears remain modeled as part of the head silhouette.
  for (const side of ["left", "right"]) {
    const s = side === "left" ? -1 : 1;
    sphere(head, materials.skin, [s * 0.218, 0.055, 0.005], [0.052, 0.085, 0.045], side + "Ear");
  }

  // Hair cap sits higher, exposing the forehead and eyes. A single sculpted
  // zig-zag fringe replaces the row of oversized round locks that obscured
  // the entire upper half of the face.
  sphere(head, materials.hair, [0, 0.285, -0.005], [0.235, 0.105, 0.195], "HairCap");

  const fringeShape = new THREE.Shape();
  fringeShape.moveTo(-0.205, 0.255);
  fringeShape.quadraticCurveTo(-0.13, 0.225, -0.105, 0.185);
  fringeShape.lineTo(-0.055, 0.225);
  fringeShape.lineTo(-0.018, 0.178);
  fringeShape.lineTo(0.025, 0.232);
  fringeShape.lineTo(0.075, 0.183);
  fringeShape.lineTo(0.12, 0.228);
  fringeShape.quadraticCurveTo(0.17, 0.238, 0.205, 0.265);
  fringeShape.lineTo(0.19, 0.305);
  fringeShape.lineTo(-0.19, 0.305);
  fringeShape.closePath();
  const fringeGeometry = new THREE.ExtrudeGeometry(fringeShape, {
    depth: 0.035, bevelEnabled: true, bevelSegments: 2,
    steps: 1, bevelSize: 0.006, bevelThickness: 0.006
  });
  const fringe = new THREE.Mesh(fringeGeometry, materials.hair);
  fringe.position.z = 0.155;
  fringe.name = "SweptHairFringe";
  fringe.castShadow = true;
  head.add(fringe);

  // Side locks and back hair complete the silhouette without covering the eyes.
  const leftLock = sphere(head, materials.hair, [-0.19, 0.105, 0.045], [0.065, 0.13, 0.12], "LeftSideLock");
  leftLock.rotation.z = -0.18;
  const rightLock = sphere(head, materials.hair, [0.19, 0.105, 0.045], [0.065, 0.13, 0.12], "RightSideLock");
  rightLock.rotation.z = 0.18;
  sphere(head, materials.hair, [0, -0.105, -0.07], [0.19, 0.10, 0.15], "BackHair");

  // Shoes remain separate accessories attached to the ankle joints.
  for (const side of ["left", "right"]) {
    const ankle = joints[side + "Ankle"];
    sphere(ankle, materials.shoeWhite, [0, -0.075, 0.105], [0.135, 0.075, 0.22], side + "Sneaker");
    sphere(ankle, materials.sole, [0, -0.12, 0.11], [0.14, 0.035, 0.225], side + "Sole");
    sphere(ankle, materials.shoeGreen, [0, -0.025, 0.19], [0.105, 0.035, 0.105], side + "ToeGreen");
    sphere(ankle, materials.shoeWhite, [0, -0.005, 0.04], [0.11, 0.025, 0.09], side + "Tongue");
  }

  // Omnitrix on the outside of the left wrist, represented as a green/white
  // cuff and a dark central face.
  const omnitrix = new THREE.Group();
  omnitrix.name = "Omnitrix";
  omnitrix.position.set(-0.01, -0.005, 0.01);
  joints.leftWrist.add(omnitrix);
  add(omnitrix, new THREE.BoxGeometry(0.12, 0.13, 0.09), materials.shoeWhite, [0, 0, 0], null, "OmnitrixCuff");
  add(omnitrix, new THREE.BoxGeometry(0.075, 0.075, 0.018), materials.green, [0, 0, 0.052], null, "OmnitrixFace");
  add(omnitrix, new THREE.CircleGeometry(0.022, 16), materials.shoeWhite, [0, 0, 0.064], null, "OmnitrixEmblem");

  group.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return { group, rig, joints };
}
