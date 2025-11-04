import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Wenbai",
  description: "文言文/白话文对译语料标注平台",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'API 文档', link: '/api' }
    ],

    sidebar: [
      {
        text: 'API 文档',
        items: [
          { text: 'API 文档', link: '/api' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
