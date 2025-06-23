# LinkedIn Post Markdown Template

This template converts LinkedIn post data into a readable markdown format for documentation, analysis, or import into Google Docs.

## Post Structure

### Author Information

**Author:** [Author Name]  
**Profile:** [Author Profile URL]  
**Title:** [Author Title/Position]  
**Post URL:** [Direct Link to Post]  
**Timestamp:** [Post Date/Time]  
**Media Type:** [text/image/video/document/article/poll/mixed]

---

## Post Content

### Text Content

[Main post text content goes here]

### Media Items

#### Images

![Image Alt Text](Image URL)
_Caption/Description: [Image description or alt text]_

#### Videos

🎥 **Video Content**

- **URL:** [Video URL]
- **Thumbnail:** [Thumbnail URL if available]
- **Duration:** [Video duration if available]
- **Description:** [Video description]

#### Documents

📎 **Document Attachment**

- **Title:** [Document title]
- **URL:** [Document link]
- **Type:** [Document type/format]
- **Description:** [Document description]

#### Articles/Links

🔗 **Shared Article**

- **Title:** [Article title]
- **URL:** [Article URL]
- **Description:** [Article description]
- **Thumbnail:** [Article preview image]

#### Carousels

🎠 **Image Carousel**

- **Image 1:** [URL] - _[Alt text]_
- **Image 2:** [URL] - _[Alt text]_
- **Image 3:** [URL] - _[Alt text]_
  [Continue for all carousel images]

#### Polls

📊 **Poll Question:** [Poll question text]

- Option 1: [Poll option 1]
- Option 2: [Poll option 2]
- Option 3: [Poll option 3]
  [Continue for all poll options]

---

## Example Usage

Here's how the template would look with actual data:

### Author Information

**Author:** Skylar Payne  
**Profile:** https://www.linkedin.com/in/skylarpayne  
**Post URL:** https://www.linkedin.com/feed/update/activity-123456789  
**Timestamp:** 2025-01-23T14:30:00Z  
**Media Type:** mixed

---

## Post Content

### Text Content

☕️ It's 2 AM. The twitter screenshot open in one tab. 50,000 logs of malicious requests in the other.

How did they get my AI chatbot to generate harmful content? And why did they have to post it on twitter?

You try to open your eyes bigger as if that would somehow make the problem reveal itself. You thought your prompt would prevent this.
Let me show you the better way.

Effective AI Engineering #28: Input Guardrails 👇

The Problem ❌

Many developers send all user inputs directly to expensive LLMs without pre-filtering. This creates challenges that aren't immediately obvious:

[Code example - see attached image]

Why this approach falls short:

- Resource Waste: Malicious queries consume expensive LLM tokens even when they'll be rejected
- Inconsistent User Experience: LLMs might occasionally comply with harmful requests despite instructions
- High Latency: Every query requires full LLM processing before potential rejection

The Solution: Pre-Processing Input Classification ✅

A better approach is to classify problematic inputs with a lightweight model before they reach your expensive main models. This pattern blocks attacks at minimal cost while providing intelligent threat detection.

[Code example - see attached image]

Why this approach works better:

- Cost Protection: Malicious queries get blocked by a cheap model before hitting expensive ones
- Intelligent Detection: AI classification catches sophisticated attacks that simple rules miss
- Scalable Defense: One lightweight model protects all your expensive downstream models

The Takeaway ✈️

Input guardrails block problematic queries before they consume expensive resources, providing faster and more reliable protection than LLM-only approaches. This pattern dramatically reduces costs from malicious usage while improving response times.

Where did you wish you had input guardrails? Tell me a story in the comments below!

### Media Items

#### Images

![View Skylar Payne's graphic link](https://media.licdn.com/dms/image/v2/D4D03AQE7BbrlPLOVBg/profile-displayphoto-shrink_100_100/B4DZRlm.5LHkAU-/0/1736871506073?e=1756339200&v=beta&t=bFR8Mj3XKHE0ArMVsvxUC9dI76oKjRBft_HuiHS60IQ)
_Profile image_

![Shared from Hypefury](https://media.licdn.com/dms/image/v2/D4E10AQEdDHmYDTb0cQ/image-shrink_800/B4EZed89HvGwAc-/0/1750701692283?e=1751313600&v=beta&t=6k4Xicrq_Sciylc2rlVT8MB_59Mflx4O4HWfd_ckyLA)
_Code example screenshot 1_

![Shared from Hypefury](https://media.licdn.com/dms/image/v2/D4E10AQElj05ZRTkQBA/image-shrink_800/B4EZed89I8HcAc-/0/1750701693291?e=1751313600&v=beta&t=dcSvLAnx9vst5AigR8FJzwHM4FlIgzd4RTmVYIT1Hr8)
_Code example screenshot 2_

---

## Notes for Google Docs Import

1. **Images:** Google Docs will automatically display images from URLs when pasting markdown
2. **Formatting:** Headers, bold text, and bullet points will be preserved
3. **Links:** URLs will be converted to clickable links
4. **Structure:** The clear section headers make it easy to navigate long posts
5. **Metadata:** Author and post information is clearly separated from content

## Customization Options

- Add company/organization information for business posts
- Include engagement metrics (likes, comments, shares) if needed
- Add tags or categories for content classification
- Include extraction timestamp for tracking when the post was captured
