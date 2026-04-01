<script setup lang="ts">
import { useSeoMeta, useHead } from '#imports';

const rapidApiUrl =
  'https://rapidapi.com/ibrahidm/api/email-verification-api14';

useSeoMeta({
  title: 'Email Verification API - Validate Emails in Real-Time',
  description:
    'Fast, accurate email verification API. Check deliverability, detect disposable emails, verify MX records, and clean your email lists. Starting at $0.003 per verification.',
  ogTitle: 'Email Verification API - Validate Emails in Real-Time',
  ogDescription:
    'Verify email addresses instantly. Detect disposable emails, check MX records, validate mailbox existence. Bulk verification up to 100 emails per request.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Email Verification API',
  twitterDescription:
    'Fast, accurate email verification. Detect disposable emails, verify deliverability, clean your lists.',
  robots: 'index, follow',
});

useHead({
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'canonical', href: 'https://email-verification-api.vercel.app' },
  ],
});

const features = [
  {
    title: 'Deliverability Check',
    description: 'Verify mailbox exists and accepts email via SMTP validation',
  },
  {
    title: 'Disposable Detection',
    description:
      'Identify temporary emails from 5,000+ known disposable domains',
  },
  {
    title: 'MX Record Validation',
    description: 'Confirm the domain has properly configured mail servers',
  },
  {
    title: 'Catch-All Detection',
    description:
      'Flag domains that accept all addresses regardless of validity',
  },
  {
    title: 'Role-Based Detection',
    description: 'Identify group addresses like info@, support@, admin@',
  },
  {
    title: 'Bulk Verification',
    description: 'Verify up to 100 emails in a single API request',
  },
];
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <!-- Header -->
    <header class="border-b border-gray-800">
      <div class="max-w-5xl mx-auto px-6 py-4">
        <h1 class="text-xl font-semibold text-white">Email Verification API</h1>
      </div>
    </header>

    <!-- Hero -->
    <main>
      <section class="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 class="text-4xl sm:text-5xl font-bold text-white mb-6">
          Verify Emails in Real-Time
        </h2>
        <p class="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Fast, accurate email verification API. Check deliverability, detect
          disposable emails, and clean your lists before sending.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            :href="rapidApiUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center justify-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Get API Key on RapidAPI
          </a>
          <a
            :href="rapidApiUrl + '#pricing'"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center justify-center px-8 py-3 border border-gray-700 hover:border-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
          >
            View Pricing
          </a>
        </div>
        <p class="mt-6 text-sm text-gray-500">
          Starting at $0.0015 per verification with free tier available
        </p>
      </section>

      <!-- Features -->
      <section class="border-t border-gray-800 bg-gray-900/50">
        <div class="max-w-5xl mx-auto px-6 py-20">
          <h3 class="text-2xl font-bold text-white text-center mb-12">
            What You Get
          </h3>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div
              v-for="feature in features"
              :key="feature.title"
              class="p-6 bg-gray-900 border border-gray-800 rounded-lg"
            >
              <h4 class="text-lg font-semibold text-white mb-2">
                {{ feature.title }}
              </h4>
              <p class="text-gray-400">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Code Example -->
      <section class="border-t border-gray-800">
        <div class="max-w-5xl mx-auto px-6 py-20">
          <h3 class="text-2xl font-bold text-white text-center mb-12">
            Simple Integration
          </h3>
          <div
            class="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
          >
            <div
              class="px-4 py-2 bg-gray-800 border-b border-gray-700 text-sm text-gray-400"
            >
              Request
            </div>
            <pre
              class="p-4 text-sm text-gray-300 overflow-x-auto"
            ><code>POST /api/v1/verify
Content-Type: application/json

{
  "email": "user@example.com"
}</code></pre>
          </div>
          <div
            class="mt-4 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
          >
            <div
              class="px-4 py-2 bg-gray-800 border-b border-gray-700 text-sm text-gray-400"
            >
              Response
            </div>
            <pre class="p-4 text-sm text-gray-300 overflow-x-auto"><code>{
  "success": true,
  "data": {
    "email": "user@example.com",
    "valid": true,
    "result": "deliverable",
    "checks": {
      "syntax": true,
      "mx_records": true,
      "smtp_valid": true,
      "disposable": false,
      "catch_all": false
    },
    "confidence": 0.95
  }
}</code></pre>
          </div>
        </div>
      </section>

      <!-- Use Cases -->
      <section class="border-t border-gray-800 bg-gray-900/50">
        <div class="max-w-5xl mx-auto px-6 py-20">
          <h3 class="text-2xl font-bold text-white text-center mb-12">
            Use Cases
          </h3>
          <div class="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div class="flex gap-4">
              <div class="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
              <div>
                <h4 class="font-semibold text-white">Email List Cleaning</h4>
                <p class="text-gray-400 text-sm mt-1">
                  Remove invalid addresses before campaigns to improve
                  deliverability
                </p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
              <div>
                <h4 class="font-semibold text-white">Registration Forms</h4>
                <p class="text-gray-400 text-sm mt-1">
                  Block disposable emails at signup to reduce fake accounts
                </p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
              <div>
                <h4 class="font-semibold text-white">Lead Validation</h4>
                <p class="text-gray-400 text-sm mt-1">
                  Verify leads before importing to CRM to maintain data quality
                </p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
              <div>
                <h4 class="font-semibold text-white">Bounce Prevention</h4>
                <p class="text-gray-400 text-sm mt-1">
                  Reduce bounce rates and protect sender reputation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="border-t border-gray-800">
        <div class="max-w-5xl mx-auto px-6 py-20 text-center">
          <h3 class="text-2xl font-bold text-white mb-4">
            Ready to verify emails?
          </h3>
          <p class="text-gray-400 mb-8">
            Get started in minutes with our RapidAPI integration.
          </p>
          <a
            :href="rapidApiUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center justify-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Get API Key on RapidAPI
          </a>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-800">
      <div
        class="max-w-5xl mx-auto px-6 py-8 text-center text-sm text-gray-500"
      >
        <p>Email Verification API</p>
      </div>
    </footer>
  </div>
</template>
