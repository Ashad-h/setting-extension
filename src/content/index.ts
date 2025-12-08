import type { CommentAuthor, Message } from '../shared/types';

console.log("LinkedIn Comment Scraper: Content script loaded");

chrome.runtime.onMessage.addListener((message: Message, _sender, _sendResponse) => {
  if (message.type === 'SCRAPE_REQUEST') {
    scrapeComments().then(data => {
      chrome.runtime.sendMessage({ type: 'SCRAPE_SUCCESS', data });
    }).catch((err: Error) => {
      console.error("Scrape error:", err);
      chrome.runtime.sendMessage({ type: 'SCRAPE_ERROR', error: err.message });
    });
  }
  return true; // Async response
});

async function scrapeComments(): Promise<CommentAuthor[]> {
  // 1. Switch to "Most Recent"
  await switchToMostRecent();

  // 2. Scroll to load all comments
  await loadAllComments();

  // 3. Scrape authors
  return extractAuthors();
}

async function switchToMostRecent() {
  console.log("Switching to Most Recent...");
  
  // Strategy: Find the dropdown trigger by class name
  const sortDropdownTrigger = document.querySelector('.comments-sort-order-toggle__trigger');

  if (sortDropdownTrigger) {
    // Check if we are already on the correct sort order?
    // The SVG icon might indicate the state, or we might just have to click and check the menu.
    // However, without text matching, it's hard to know *current* state purely by class unless we check aria-current or specific state classes.
    // The provided HTML doesn't show a distinct class for "Most Recent" selected on the trigger itself, 
    // but the trigger text usually updates. 
    // Since we can't rely on text, we might just blindly open it and try to click the "Most recent" option by its index or attribute if possible.
    // But usually, the options in the dropdown are standard. 
    // Let's open the dropdown first.

    (sortDropdownTrigger as HTMLElement).click();
    await wait(1000); 

    // Find the options in the dropdown.
    // The dropdown content usually appears in `.comments-sort-order-toggle__content` or a portal.
    // We need to find the option that corresponds to "Most recent". 
    // If we can't use text, is there a consistent order?
    // Usually: 0 = Top/Relevant, 1 = Recent. 
    // Let's try to select the second option if available, or check if there's a specific data attribute.
    
    // In the user's provided HTML, the options container is `.comments-sort-order-toggle__content`.
    // We'll look for child elements that are clickable options.
    const optionsContainer = document.querySelector('.comments-sort-order-toggle__content');
    if (optionsContainer) {
        const options = Array.from(optionsContainer.querySelectorAll('[role="button"], li, button'));
        
        // Assumption: "Most Recent" is usually the second option (index 1) or the one that isn't currently selected.
        // If we can't rely on text, we have to guess based on position or other attributes.
        // However, the prompt says "Don't rely on text copy for button", implying we should use classes/IDs.
        // If there's no specific class for "Recent", position is the next best guess.
        // LinkedIn usually has "Top" and "Recent".
        
        // Let's look for an option that does NOT have the "selected" state if possible, or just pick the last one (often Recent).
        // But checking the last one is safer than index 1 if there are only 2 options.
        
        if (options.length > 1) {
            // Click the second option (index 1) which is typically "Most Recent"
            const recentOption = options[1] as HTMLElement;
            recentOption.click();
            console.log("Clicked option at index 1 (assuming Most Recent)");
            await wait(2000);
        } else {
             console.warn("Not enough options found in sort dropdown");
        }
    } else {
        // Fallback: sometimes options are attached to document body in a portal
        // We can look for `.artdeco-dropdown__content` that just appeared.
        const allDropdowns = document.querySelectorAll('.artdeco-dropdown__content');
        // The last one might be the one we just opened
        const lastDropdown = allDropdowns[allDropdowns.length - 1];
        if (lastDropdown) {
             const options = Array.from(lastDropdown.querySelectorAll('[role="button"], li, button'));
             if (options.length > 1) {
                (options[1] as HTMLElement).click();
                console.log("Clicked portal option at index 1");
                await wait(2000);
             }
        }
    }
  } else {
    console.warn("Could not find Sort button trigger by class");
  }
}

async function loadAllComments() {
  console.log("Loading all comments...");
  
  const MAX_SCROLLS = 50; 
  let scrolls = 0;
  let lastHeight = 0;
  let sameHeightCount = 0;

  while (scrolls < MAX_SCROLLS) {
    window.scrollTo(0, document.body.scrollHeight);
    
    // Selectors purely based on class names provided
    // .comments-comments-list__load-more-comments-button--cr
    // .comments-comments-list__load-more-comments-arrows
    
    const loadMoreSelectors = [
        '.comments-comments-list__load-more-comments-button--cr',
        '.comments-comments-list__load-more-comments-arrows'
    ];

    let clicked = false;
    for (const selector of loadMoreSelectors) {
        const btns = document.querySelectorAll(selector);
        for (const btn of btns) {
             if ((btn as HTMLElement).offsetParent !== null) { // Visible
                console.log("Clicking load more button (class match):", selector);
                (btn as HTMLElement).click();
                clicked = true;
                await wait(500);
                // Don't break immediately, there might be multiple buttons? usually just one main one.
                break; 
             }
        }
        if (clicked) break;
    }

    await wait(1500);

    const currentHeight = document.body.scrollHeight;
    if (currentHeight === lastHeight && !clicked) {
      sameHeightCount++;
      if (sameHeightCount > 3) break; 
    } else {
      sameHeightCount = 0;
    }
    lastHeight = currentHeight;
    scrolls++;
  }
  console.log("Finished scrolling");
}

function extractAuthors(): CommentAuthor[] {
  console.log("Extracting authors...");
  const authors = new Map<string, CommentAuthor>();

  const commentArticles = document.querySelectorAll('article');
  
  commentArticles.forEach(article => {
    const authorLink = article.querySelector('a[data-test-app-aware-link], a.app-aware-link') as HTMLAnchorElement;
    
    if (authorLink) {
       const profileUrl = authorLink.href;
       const name = authorLink.innerText.trim().split('\n')[0];
       const id = profileUrl;
       
       const articleText = (article as HTMLElement).innerText;
       const headlineParams = articleText.split('\n');
       const headline = headlineParams.length > 1 ? headlineParams[1] : undefined;

       if (name && profileUrl) {
           authors.set(id, { id, name, profileUrl, headline });
       }
    }
  });

  if (authors.size === 0) {
     const links = document.querySelectorAll('a.comments-comment-meta__description-title, span.comments-comment-meta__description-title');
     links.forEach(el => {
        const name = (el as HTMLElement).innerText.trim();
        const parentLink = el.closest('a') as HTMLAnchorElement;
        const profileUrl = parentLink ? parentLink.href : '';
        
        if (name && profileUrl) {
            authors.set(profileUrl, { id: profileUrl, name, profileUrl });
        }
     });
  }

  const result = Array.from(authors.values());
  console.log(`Found ${result.length} authors`);
  return result;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
