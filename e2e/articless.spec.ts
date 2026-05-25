import { test, expect } from '@playwright/test';

test.describe('Articless E2E Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Go to home/search page
    await page.goto('http://localhost:5173');
  });

  // 1. Search Flow Test
  test('should search articles from arXiv and show results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Ara"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('deep learning');
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForURL(/\/search\?q=deep\+learning/);
    const resultsContainer = page.locator('.grid');
    await expect(resultsContainer).toBeVisible();

    // Verify list item count and badges
    const articles = page.locator('.grid > div');
    await expect(articles.first()).toBeVisible();
    await expect(articles).toHaveCount({ min: 1 });
  });

  // 2. Shelf & Draft Saving E2E Test
  test('should add article to shelf and verify AI Writer auto-saves draft', async ({ page }) => {
    // Search first
    await page.goto('http://localhost:5173/search?q=quantum+computing');
    
    // Open Shelf modal
    const addShelfBtn = page.locator('button:has-text("Rafa Ekle")').first();
    await addShelfBtn.click();

    // Modal should appear
    const modal = page.locator('div:has-text("Rafa Ekle")');
    await expect(modal).toBeVisible();

    // Create a new shelf
    const newShelfInput = page.locator('input[placeholder="Yeni raf adı..."]');
    await newShelfInput.fill('E2E Test Shelf');
    const createShelfBtn = page.locator('button:has-text("+")');
    await createShelfBtn.click();

    // Add article to the new shelf
    const shelfBtn = page.locator('button:has-text("E2E Test Shelf")').first();
    await shelfBtn.click();

    // Wait for modal to close (loading abstract completed)
    await expect(modal).not.toBeVisible();

    // Go to Library page to open shelf
    await page.goto('http://localhost:5173/library');
    const shelfLink = page.locator('h3:has-text("E2E Test Shelf")');
    await shelfLink.click();

    // Open AI Writer for that shelf
    const writerBtn = page.locator('button:has-text("AI Writer")');
    await writerBtn.click();

    // Editor should be loaded
    const editor = page.locator('.ql-editor');
    await expect(editor).toBeVisible();

    // Write something in the editor
    await editor.fill('This is a draft content written by E2E automation test.');

    // Wait for debounced auto-save (1.5 seconds)
    const saveStatus = page.locator('span:has-text("Kaydedildi")');
    await expect(saveStatus).toBeVisible({ timeout: 5000 });

    // Refresh page to verify persistence from SQLite database
    await page.reload();
    await expect(editor).toHaveText('This is a draft content written by E2E automation test.');
  });

  // 3. Presentation Canvas Interactions E2E Test
  test('should handle presentation editor canvas actions and AI Assistant commands', async ({ page }) => {
    // Navigate directly to presentation page of a mocked article
    await page.goto('http://localhost:5173/presentation/test-id?title=E2E%20Test%20Presentation&source=pubmed');

    // Wait for initial generation loading
    const canvas = page.locator('div[style*="width: 960px"]');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 3.1 Elements manipulation (Add Text Element)
    const textToolBtn = page.locator('button:has-text("Metin")');
    await textToolBtn.click();

    // Check if new element is added to canvas
    const textElement = canvas.locator('textarea:has-text("Yeni Metin")');
    await expect(textElement).toBeVisible();

    // Try deleting the selected element
    const deleteBtn = page.locator('button[title="Seçileni Sil"]');
    await deleteBtn.click();
    await expect(textElement).not.toBeVisible();

    // 3.2 Image URL Validation Modal
    const imgToolBtn = page.locator('button:has-text("Görsel")');
    await imgToolBtn.click();

    const imgModal = page.locator('div:has-text("Görsel Ekle")');
    await expect(imgModal).toBeVisible();

    const imgUrlInput = imgModal.locator('input[placeholder*="image.png"]');
    await imgUrlInput.fill('invalid-url-format');
    const addImgSubmit = imgModal.locator('button:has-text("Ekle")');
    await addImgSubmit.click();

    // Invalid format error should be shown
    const errorMsg = imgModal.locator('p.text-red-400');
    await expect(errorMsg).toContainText('Geçersiz görsel URL formatı');

    const closeBtn = imgModal.locator('button:has-text("✕")');
    // If there is X close button
    const xBtn = imgModal.locator('button').first();
    await xBtn.click();

    // 3.3 AI Assistant Command Parsing
    const chatInput = page.locator('textarea[placeholder*="Yeni slayt içeriği"]');
    await chatInput.fill('Yeni bir slayt ekle');
    const sendBtn = page.locator('button:has-text("Gönder")'); // or Send icon
    
    // We send message
    await chatInput.press('Enter');

    // Wait for AI response processing and command execution
    // This command triggers ADD_SLIDE which adds a slide, thus slides list will grow
    const slideThumbnails = page.locator('.flex-shrink-0.w-32.h-20');
    // Initially we have title slide + initial slides (min 2 total).
    // An added slide will increase this count.
    await expect(slideThumbnails).toHaveCount({ min: 3 }, { timeout: 15000 });
  });

});
