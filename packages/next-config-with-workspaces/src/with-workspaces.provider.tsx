import path     from 'path'
import { sync } from 'globby'

import Project  from '@lerna/project'

export const withWorkspaces = (nextConfig: any = {}) => ({
  ...nextConfig,
  webpack(
    config = process.env.webpackStubConfig ? JSON.parse(process.env.webpackStubConfig) : null,
    options = process.env.optionsStub ? process.env.optionsStub : null,
  ) {
    const cwd = process.cwd()
    const project = new Project(cwd)

    const packageConfigPaths = (project.config.packages || []).reduce(
      (result, pkg: string) => [
        ...result,
        ...sync(path.join(pkg, 'package.json'), {
          cwd: project.rootPath,
          ignore: ['**/node_modules/**'],
          absolute: true,
        }),
      ],
      [],
    )

    const includes = packageConfigPaths
      .filter(pkg => !pkg.includes(cwd))
      .map(pkg => path.dirname(pkg))
      .map(dirname => new RegExp(`${dirname}(?!.*node_modules)`))

    config.module.rules.forEach(rule => {
      if (rule.use && rule.use.loader === 'next-babel-loader') {
        rule.include = rule.include.concat(includes) // eslint-disable-line no-param-reassign
      }
      if (rule.use && Array.isArray(rule.use)) {
        rule.use.forEach(useItem => {
          if (useItem.loader === 'next-babel-loader') {
            rule.include = rule.include.concat(includes) // eslint-disable-line no-param-reassign
          }
        })
      }
    })

    if (typeof nextConfig.webpack === 'function') {
      return nextConfig.webpack(config, options)
    }

    return config
  },
})
