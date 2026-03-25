export const examplePrompts = [
  {
    name: 'Login Form',
    prompt: `Create a login form UI in Tailwind CSS. Return ONLY a JSON object with "components" array.

Schema for each component:
{
  "tag": "HTML tag (div, button, input, label, a, span, p, h1-h6, ul, ol, li, table, tr, td, th, form, select, option, textarea, img, section, article, header, footer, nav, main, aside, svg, path, circle, rect, line, polyline, polygon, ellipse, g)",
  "className": "Tailwind CSS classes",
  "children": "text string or nested components array",
  "props": {"attribute": "value"} (optional - HTML attributes like type, placeholder, required, disabled, checked, value, name, id, href, src, alt, title, method, action, for, min, max, step, accept, multiple, readOnly, maxLength, minLength, pattern, viewBox, fill, stroke, strokeWidth, d, cx, cy, r, etc.)
}

Login form requirements:
- Email input field with label
- Password input field with label
- Login button
- "Forgot password?" link

Return ONLY the JSON, no other text.`
  },
  {
    name: 'Registration Form',
    prompt: `Create a registration form UI in Tailwind CSS. Return ONLY a JSON object with "components" array.

Schema for each component:
{
  "tag": "HTML tag",
  "className": "Tailwind CSS classes",
  "children": "text string or nested components array",
  "props": {"attribute": "value"}
}

Registration form requirements:
- Full Name input
- Email input
- Password input
- Confirm Password input
- Terms and conditions checkbox
- Sign Up button
- "Already have an account? Login" link

Return ONLY the JSON, no other text.`
  },
  {
    name: 'Contact Card',
    prompt: `Create a contact card UI in Tailwind CSS. Return ONLY a JSON object with "components" array.

Schema for each component:
{
  "tag": "HTML tag",
  "className": "Tailwind CSS classes",
  "children": "text string or nested components array",
  "props": {"attribute": "value"}
}

Contact card requirements:
- Circular avatar image placeholder
- Name as heading
- Job title
- Email link
- Phone number
- Two social media icon links (use SVG icons)

Return ONLY the JSON, no other text.`
  },
  {
    name: 'Pricing Table',
    prompt: `Create a pricing table UI in Tailwind CSS. Return ONLY a JSON object with "components" array.

Schema for each component:
{
  "tag": "HTML tag",
  "className": "Tailwind CSS classes",
  "children": "text string or nested components array",
  "props": {"attribute": "value"}
}

Pricing table requirements:
- 3 pricing tiers: Basic ($9/mo), Pro ($29/mo), Enterprise ($99/mo)
- Each tier should have: title, price, feature list (3-4 items), "Get Started" button
- Make the middle tier (Pro) highlighted as popular

Return ONLY the JSON, no other text.`
  },
  {
    name: 'Button with Icon',
    prompt: `Create a button with an SVG icon in Tailwind CSS. Return ONLY a JSON object with "components" array.

Schema for each component:
{
  "tag": "HTML tag (button, div, span, a, svg, path, circle, rect, etc.)",
  "className": "Tailwind CSS classes",
  "children": "text string or nested components array",
  "props": {"attribute": "value"}
}

Button requirements:
- Primary styled button
- Contains an SVG icon (search, cart, or user icon)
- Button text label
- Hover effect

SVG tags: svg, path, circle, rect, line, polyline, polygon, ellipse, g
SVG props: viewBox, fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, fillOpacity, strokeOpacity, d, cx, cy, r, rx, ry, x, y, width, height

Return ONLY the JSON, no other text.`
  },
  {
    name: 'Navigation Bar',
    prompt: `Create a navigation bar UI in Tailwind CSS. Return ONLY a JSON object with "components" array.

Schema for each component:
{
  "tag": "HTML tag",
  "className": "Tailwind CSS classes",
  "children": "text string or nested components array",
  "props": {"attribute": "value"}
}

Navigation bar requirements:
- Logo/brand name on the left
- Navigation links in the center (Home, Features, Pricing, About)
- "Sign In" and "Get Started" buttons on the right
- Sticky top positioning

Return ONLY the JSON, no other text.`
  },
  {
    name: 'Product Card',
    prompt: `Create a product card UI in Tailwind CSS. Return ONLY a JSON object with "components" array.

Schema for each component:
{
  "tag": "HTML tag",
  "className": "Tailwind CSS classes",
  "children": "text string or nested components array",
  "props": {"attribute": "value"}
}

Product card requirements:
- Product image placeholder
- Product title
- Short description (2 lines)
- Price display ($49.99)
- Star rating (4 stars filled, 1 empty)
- "Add to Cart" button
- Wishlist heart icon

Return ONLY the JSON, no other text.`
  },
  {
    name: 'Footer',
    prompt: `Create a footer UI in Tailwind CSS. Return ONLY a JSON object with "components" array.

Schema for each component:
{
  "tag": "HTML tag",
  "className": "Tailwind CSS classes",
  "children": "text string or nested components array",
  "props": {"attribute": "value"}
}

Footer requirements:
- 4 columns: Company (About, Careers, Blog), Product (Features, Pricing, Docs), Support (Help Center, Contact, Status), Legal (Privacy, Terms, License)
- Social media icons in a row
- Copyright text at bottom

Return ONLY the JSON, no other text.`
  }
];
