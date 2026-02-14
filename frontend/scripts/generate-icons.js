#!/usr/bin/env node

/**
 * Icon Generator Script
 * Generates PNG icons in all required sizes for PWA
 * 
 * Requirements:
 * - sharp (already installed)
 * - Node.js
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes needed
const ICON_SIZES = [
  72, 96, 128, 144, 152, 192, 384, 512
];

// Shortcut icon sizes
const SHORTCUT_SIZES = 96;

// Paths
const ICONS_DIR = path.join(__dirname, '../public/icons');
const SOURCE_SVG = path.join(ICONS_DIR, 'icon-512x512.svg');

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  try {
    // Check if source SVG exists
    if (!fs.existsSync(SOURCE_SVG)) {
      throw new Error(`Source SVG not found: ${SOURCE_SVG}`);
    }

    // Generate main icons
    console.log('Generating standard icons:');
    for (const size of ICON_SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      
      await sharp(SOURCE_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`  ✓ Generated ${size}x${size} icon`);
    }

    // Generate maskable icon
    console.log('\nGenerating maskable icon:');
    const maskablePath = path.join(ICONS_DIR, 'icon-maskable-512x512.png');
    await sharp(SOURCE_SVG)
      .resize(512, 512)
      .png()
      .toFile(maskablePath);
    console.log('  ✓ Generated maskable icon');

    // Generate badge
    console.log('\nGenerating badge:');
    const badgePath = path.join(ICONS_DIR, 'badge-96x96.png');
    await sharp(SOURCE_SVG)
      .resize(96, 96)
      .png()
      .toFile(badgePath);
    console.log('  ✓ Generated 96x96 badge');

    // Generate shortcut icons
    console.log('\nGenerating shortcut icons:');
    
    // Task shortcut (briefcase icon)
    const taskSvg = createTaskIcon();
    const taskPath = path.join(ICONS_DIR, 'task-shortcut.png');
    await sharp(Buffer.from(taskSvg))
      .resize(SHORTCUT_SIZES, SHORTCUT_SIZES)
      .png()
      .toFile(taskPath);
    console.log('  ✓ Generated task shortcut');

    // Chat shortcut (message icon)
    const chatSvg = createChatIcon();
    const chatPath = path.join(ICONS_DIR, 'chat-shortcut.png');
    await sharp(Buffer.from(chatSvg))
      .resize(SHORTCUT_SIZES, SHORTCUT_SIZES)
      .png()
      .toFile(chatPath);
    console.log('  ✓ Generated chat shortcut');

    // Agent shortcut (robot icon)
    const agentSvg = createAgentIcon();
    const agentPath = path.join(ICONS_DIR, 'agent-shortcut.png');
    await sharp(Buffer.from(agentSvg))
      .resize(SHORTCUT_SIZES, SHORTCUT_SIZES)
      .png()
      .toFile(agentPath);
    console.log('  ✓ Generated agent shortcut');

    console.log('\n✅ All icons generated successfully!\n');
    console.log('Icon files created:');
    const files = fs.readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'));
    files.forEach(file => console.log(`  - ${file}`));

  } catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Helper functions to create SVG strings for shortcuts
function createTaskIcon() {
  return `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="96" height="96" rx="20" fill="#6366f1"/>
    <rect x="20" y="24" width="56" height="48" rx="4" fill="white"/>
    <rect x="26" y="32" width="32" height="4" rx="2" fill="#6366f1"/>
    <rect x="26" y="42" width="44" height="4" rx="2" fill="#c7d2fe"/>
    <rect x="26" y="52" width="24" height="4" rx="2" fill="#c7d2fe"/>
  </svg>`;
}

function createChatIcon() {
  return `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="96" height="96" rx="20" fill="#6366f1"/>
    <path d="M20 24H76C78.2 24 80 25.8 80 28V60C80 62.2 78.2 64 76 64H32L20 76V24Z" fill="white"/>
    <circle cx="36" cy="44" r="4" fill="#6366f1"/>
    <circle cx="48" cy="44" r="4" fill="#6366f1"/>
    <circle cx="60" cy="44" r="4" fill="#6366f1"/>
  </svg>`;
}

function createAgentIcon() {
  return `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="96" height="96" rx="20" fill="#6366f1"/>
    <circle cx="48" cy="36" r="16" fill="white"/>
    <path d="M20 76C20 63.8 29.8 54 42 54H54C66.2 54 76 63.8 76 76H20Z" fill="white"/>
    <rect x="38" y="30" width="4" height="4" rx="1" fill="#6366f1"/>
    <rect x="54" y="30" width="4" height="4" rx="1" fill="#6366f1"/>
    <rect x="40" y="42" width="16" height="3" rx="1" fill="#c7d2fe"/>
  </svg>`;
}

// Run the generator
generateIcons();

