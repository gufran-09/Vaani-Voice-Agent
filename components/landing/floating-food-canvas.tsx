'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CafeItemConfig {
  id: string;
  name: string;
  image: string;
  heroPos: [number, number, number];
  heroRot: [number, number, number];
  heroScale: number;
  atmoPos: [number, number, number];
  atmoRot: [number, number, number];
  worksPos: [number, number, number];
  worksRot: [number, number, number];
  ctaPos: [number, number, number];
  ctaRot: [number, number, number];
  floatSpeed: number;
  floatAmplitude: number;
  rotationSpeed: number;
}

const CAFE_ITEMS: CafeItemConfig[] = [
  {
    id: 'coffee-beans',
    name: 'Roasted Espresso Beans',
    image: '/images/cafe/coffee-beans.png',
    heroPos: [3.2, 1.4, -0.5],
    heroRot: [0.1, -0.2, 0.15],
    heroScale: 1.6,
    atmoPos: [3.4, 0.4, -1],
    atmoRot: [0.2, -0.4, 0.2],
    worksPos: [-3.0, 0.8, -0.4],
    worksRot: [0.1, 0.2, -0.1],
    ctaPos: [2.6, 0.8, 0],
    ctaRot: [0.08, -0.2, 0.05],
    floatSpeed: 1.4,
    floatAmplitude: 0.12,
    rotationSpeed: 0.4,
  },
  {
    id: 'artisan-croissant',
    name: 'Golden French Croissant',
    image: '/images/cafe/croissant.png',
    heroPos: [-3.3, -1.2, 0],
    heroRot: [-0.08, 0.25, -0.1],
    heroScale: 1.9,
    atmoPos: [-3.6, -0.8, -0.8],
    atmoRot: [-0.15, 0.35, -0.15],
    worksPos: [2.8, -1.1, 0],
    worksRot: [0.1, -0.2, 0.08],
    ctaPos: [-2.7, -0.7, 0.2],
    ctaRot: [-0.1, 0.2, -0.06],
    floatSpeed: 1.1,
    floatAmplitude: 0.14,
    rotationSpeed: 0.3,
  },
  {
    id: 'latte-art-cup',
    name: 'Espresso Latte Art',
    image: '/images/cafe/espresso-cup.png',
    heroPos: [3.3, -1.3, 0.2],
    heroRot: [0.15, 0.1, -0.05],
    heroScale: 1.7,
    atmoPos: [2.8, -1.5, -0.5],
    atmoRot: [0.25, 0.15, -0.1],
    worksPos: [-2.7, -1.4, 0.2],
    worksRot: [0.08, 0.15, -0.05],
    ctaPos: [2.8, -1.0, 0.3],
    ctaRot: [0.12, 0.08, -0.04],
    floatSpeed: 1.25,
    floatAmplitude: 0.1,
    rotationSpeed: 0.35,
  },
  {
    id: 'glass-cup',
    name: 'Double-Walled Glass Cup',
    image: '/images/cafe/glass-cup.png',
    heroPos: [-3.2, 1.3, -0.4],
    heroRot: [-0.1, -0.2, 0.1],
    heroScale: 1.7,
    atmoPos: [-3.5, 1.1, -1],
    atmoRot: [-0.2, -0.3, 0.15],
    worksPos: [3.1, 0.9, -0.2],
    worksRot: [-0.1, 0.18, 0.08],
    ctaPos: [-2.6, 1.0, 0.1],
    ctaRot: [-0.08, -0.15, 0.05],
    floatSpeed: 1.3,
    floatAmplitude: 0.11,
    rotationSpeed: 0.38,
  },
];

export function FloatingFoodCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check WebGL availability
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      setWebGLSupported(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 7;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Warm café lighting
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff0db, 1.6);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const accentLight = new THREE.DirectionalLight(0xe85d3f, 0.35);
    accentLight.position.set(-6, -4, 3);
    scene.add(accentLight);

    const cafeGroup = new THREE.Group();
    scene.add(cafeGroup);

    interface CafeMeshNode {
      config: CafeItemConfig;
      mesh: THREE.Mesh;
      shadowMesh: THREE.Mesh;
      basePos: THREE.Vector3;
      baseRot: THREE.Euler;
      targetPos: THREE.Vector3;
      targetRot: THREE.Euler;
      targetScale: number;
    }

    const nodes: CafeMeshNode[] = [];
    const textureLoader = new THREE.TextureLoader();

    CAFE_ITEMS.forEach((item) => {
      textureLoader.load(item.image, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;

        // Front asset plane
        const planeGeo = new THREE.PlaneGeometry(item.heroScale, item.heroScale);
        const planeMat = new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          alphaTest: 0.01,
          roughness: 0.35,
          metalness: 0.08,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(planeGeo, planeMat);
        mesh.position.set(...item.heroPos);
        mesh.rotation.set(...item.heroRot);

        // Soft contact shadow underneath
        const shadowGeo = new THREE.PlaneGeometry(item.heroScale * 0.9, item.heroScale * 0.3);
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x3b2418,
          transparent: true,
          opacity: 0.12,
        });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.position.set(item.heroPos[0], item.heroPos[1] - item.heroScale * 0.52, item.heroPos[2] - 0.1);
        shadowMesh.rotation.x = -Math.PI / 2.2;

        cafeGroup.add(mesh);
        cafeGroup.add(shadowMesh);

        nodes.push({
          config: item,
          mesh,
          shadowMesh,
          basePos: new THREE.Vector3(...item.heroPos),
          baseRot: new THREE.Euler(...item.heroRot),
          targetPos: new THREE.Vector3(...item.heroPos),
          targetRot: new THREE.Euler(...item.heroRot),
          targetScale: item.heroScale,
        });

        if (nodes.length === CAFE_ITEMS.length) {
          setIsLoaded(true);
        }
      });
    });

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Scroll interpolation
    let currentScrollProgress = 0;
    const handleScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      currentScrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Damped mouse movement
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const sp = currentScrollProgress;

      nodes.forEach(({ config, mesh, shadowMesh, targetPos, targetRot }) => {
        let pStart = config.heroPos;
        let rStart = config.heroRot;
        let pEnd = config.atmoPos;
        let rEnd = config.atmoRot;
        let t = 0;

        if (sp < 0.33) {
          t = sp / 0.33;
          pStart = config.heroPos;
          rStart = config.heroRot;
          pEnd = config.atmoPos;
          rEnd = config.atmoRot;
        } else if (sp < 0.66) {
          t = (sp - 0.33) / 0.33;
          pStart = config.atmoPos;
          rStart = config.atmoRot;
          pEnd = config.worksPos;
          rEnd = config.worksRot;
        } else {
          t = (sp - 0.66) / 0.34;
          pStart = config.worksPos;
          rStart = config.worksRot;
          pEnd = config.ctaPos;
          rEnd = config.ctaRot;
        }

        const smoothT = t * t * (3 - 2 * t);

        targetPos.x = pStart[0] + (pEnd[0] - pStart[0]) * smoothT;
        targetPos.y = pStart[1] + (pEnd[1] - pStart[1]) * smoothT;
        targetPos.z = pStart[2] + (pEnd[2] - pStart[2]) * smoothT;

        targetRot.x = rStart[0] + (rEnd[0] - rStart[0]) * smoothT;
        targetRot.y = rStart[1] + (rEnd[1] - rStart[1]) * smoothT;
        targetRot.z = rStart[2] + (rEnd[2] - rStart[2]) * smoothT;

        const floatY = prefersReducedMotion
          ? 0
          : Math.sin(elapsed * config.floatSpeed) * config.floatAmplitude;
        const wobbleRot = prefersReducedMotion
          ? 0
          : Math.cos(elapsed * config.floatSpeed * 0.8) * 0.04;

        mesh.position.x += (targetPos.x + mouseX * 0.4 - mesh.position.x) * 0.08;
        mesh.position.y += (targetPos.y - mouseY * 0.3 + floatY - mesh.position.y) * 0.08;
        mesh.position.z += (targetPos.z - mesh.position.z) * 0.08;

        mesh.rotation.x += (targetRot.x + wobbleRot - mesh.rotation.x) * 0.08;
        mesh.rotation.y += (targetRot.y + mouseX * 0.15 - mesh.rotation.y) * 0.08;
        mesh.rotation.z += (targetRot.z - mesh.rotation.z) * 0.08;

        shadowMesh.position.x = mesh.position.x;
        shadowMesh.position.y = mesh.position.y - config.heroScale * 0.52 - floatY * 0.5;
        shadowMesh.position.z = mesh.position.z - 0.1;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!webGLSupported) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-1000"
      style={{ opacity: isLoaded ? 1 : 0 }}
      aria-hidden="true"
    />
  );
}
