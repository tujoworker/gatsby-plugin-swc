import { graphql } from 'gatsby'
import { css } from '@emotion/react'

const style = css({ color: 'red', background: 'black' })

console.log('style', style)

const ComponentName = ({ data }) => {
  return <pre css={style}>{JSON.stringify(data, null, 4)}</pre>
}

export const query = graphql`
  {
    site {
      buildTime
    }
  }
`

export default ComponentName
