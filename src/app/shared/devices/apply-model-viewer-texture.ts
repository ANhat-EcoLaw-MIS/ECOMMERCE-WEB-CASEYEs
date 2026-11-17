/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Puts a painted case texture onto a <model-viewer> phone mesh.
 * Ported from the studio's `sync3dTexture` (studio-workspace.ts): it borrows three.js
 * constructors from model-viewer's internal scene, adds a textured back plate plus a bumper,
 * and falls back to model-viewer's public texture API when the scene is not reachable.
 *
 * The plate/bumper sizes match the iPhone .glb files in /public/models.
 */

const OVERLAY = 'CaseOverlayMesh';
const BUMPER = 'CaseExtrusionBumper';

function sceneOf(mv: any): any {
  const sym = Object.getOwnPropertySymbols(mv).find((s) => s.toString().includes('scene'));
  return sym ? mv[sym] : null;
}

function wake(scene: any): void {
  scene.isDirty = true;
  if (typeof scene.queueRender === 'function') {
    scene.queueRender();
    requestAnimationFrame(() => scene.queueRender?.());
  }
}

function roundedOutline(w: number, h: number, r: number, seg: number): { x: number; y: number }[] {
  const corners = [
    { cx: w - r, cy: h - r, a: 0 },
    { cx: -w + r, cy: h - r, a: Math.PI / 2 },
    { cx: -w + r, cy: -h + r, a: Math.PI },
    { cx: w - r, cy: -h + r, a: Math.PI * 1.5 },
  ];
  const pts: { x: number; y: number }[] = [];
  for (const c of corners) {
    for (let i = 0; i < seg; i++) {
      const t = c.a + (i / seg) * (Math.PI / 2);
      pts.push({ x: c.cx + r * Math.cos(t), y: c.cy + r * Math.sin(t) });
    }
  }
  return pts;
}

export async function applyModelViewerTexture(mv: any, canvas: HTMLCanvasElement, rimColor: string): Promise<boolean> {
  if (!mv?.model) return false;
  const W = canvas.width;
  const H = canvas.height;
  const scene = sceneOf(mv);

  if (scene) {
    let backMesh: any = null;
    let sampleMesh: any = null;
    let foundTex: any = null;
    scene.traverse((o: any) => {
      if (!o.isMesh) return;
      if (!sampleMesh && o.name !== OVERLAY && o.name !== BUMPER) sampleMesh = o;
      if (o.material?.map && !foundTex) foundTex = o.material.map;
      if (
        o.name === 'wLfSXtbwRlBrwof' ||
        o.material?.name === 'oZRkkORNzkufnGD' ||
        o.material?.name === 'glass' ||
        o.name?.toLowerCase().includes('back')
      ) {
        backMesh = o;
      }
      if (o.name === 'IykfmVvLplTsTEW' || o.material?.name === 'PaletteMaterial004') o.visible = false;
    });
    backMesh ??= sampleMesh;

    const Tex = foundTex?.constructor;
    if (backMesh && sampleMesh && Tex) {
      const Mesh = sampleMesh.constructor;
      const Material = sampleMesh.material.constructor;
      const Geometry = sampleMesh.geometry.constructor;
      const Attribute = sampleMesh.geometry.attributes.position.constructor;

      // Flip to match the back-facing UVs of the phone model.
      const flipped = document.createElement('canvas');
      flipped.width = W;
      flipped.height = H;
      const fctx = flipped.getContext('2d');
      if (fctx) {
        fctx.translate(W, H);
        fctx.scale(-1, -1);
        fctx.drawImage(canvas, 0, 0);
        const tex = new Tex(flipped);
        if ('colorSpace' in tex) tex.colorSpace = 'srgb';
        // Non-power-of-two canvas: no mipmaps + linear filtering, so it also renders on WebGL1 GPUs
        // (otherwise the texture can come out blank there).
        tex.generateMipmaps = false;
        tex.minFilter = 1006; // THREE.LinearFilter
        tex.magFilter = 1006;
        tex.needsUpdate = true;

        const hw = 3.9, hh = 8.0, z = 0.425;
        const plate = new Geometry();
        plate.setAttribute('position', new Attribute(new Float32Array([-hw, -hh, z, hw, -hh, z, hw, hh, z, -hw, hh, z]), 3));
        plate.setAttribute('uv', new Attribute(new Float32Array([1, 1, 0, 1, 0, 0, 1, 0]), 2));
        plate.setAttribute('normal', new Attribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
        plate.setIndex(new Attribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));

        let overlay = backMesh.parent.getObjectByName(OVERLAY);
        if (!overlay) {
          const mat = new Material();
          overlay = new Mesh(plate, mat);
          overlay.name = OVERLAY;
          overlay.scale.copy(backMesh.scale);
          backMesh.parent.add(overlay);
        } else {
          overlay.geometry = plate;
        }
        Object.assign(overlay.material, { map: tex, transparent: true, side: 2, roughness: 0.88, metalness: 0 });
        overlay.material.needsUpdate = true;

        // Bumper: outer sidewall + raised lip.
        const seg = 12, N = seg * 4;
        const out = roundedOutline(hw, hh, 1.2, seg);
        const inn = roundedOutline(3.74, 7.85, 1.05, seg);
        const zBack = 0.435, zFront = -0.52;
        const pos: number[] = [];
        for (const p of out) pos.push(p.x, p.y, zBack);
        for (const p of out) pos.push(p.x, p.y, zFront);
        for (const p of inn) pos.push(p.x, p.y, zBack);
        const idx: number[] = [];
        for (let i = 0; i < N; i++) {
          const n = (i + 1) % N;
          idx.push(i, N + i, n, n, N + i, N + n);
          idx.push(2 * N + i, i, 2 * N + n, 2 * N + n, i, n);
        }
        const bumperGeo = new Geometry();
        bumperGeo.setAttribute('position', new Attribute(new Float32Array(pos), 3));
        bumperGeo.setIndex(new Attribute(new Uint16Array(idx), 1));
        bumperGeo.computeVertexNormals();

        let bumper = backMesh.parent.getObjectByName(BUMPER);
        if (!bumper) {
          bumper = new Mesh(bumperGeo, new Material());
          bumper.name = BUMPER;
          bumper.scale.copy(backMesh.scale);
          backMesh.parent.add(bumper);
        } else {
          bumper.geometry = bumperGeo;
        }
        bumper.material.color.set(rimColor);
        Object.assign(bumper.material, { roughness: 0.85, metalness: 0.1, side: 2 });
        bumper.material.needsUpdate = true;

        wake(scene);
        return true;
      }
    }
  }

  // Fallback: public texture API.
  const target = mv.model?.materials?.find(
    (m: any) => m.name === 'oZRkkORNzkufnGD' || m.name === 'glass' || m.name === 'back' || m.name?.toLowerCase().includes('case'),
  );
  if (!target?.pbrMetallicRoughness?.baseColorTexture) return false;
  try {
    const texture = await mv.createTexture(canvas.toDataURL('image/png'));
    target.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
    target.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
    if (scene) wake(scene);
    return true;
  } catch {
    return false;
  }
}
