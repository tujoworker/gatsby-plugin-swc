// import React from 'react'
import { graphql } from 'gatsby'
import styled from '@emotion/styled'

const Box = styled.pre`
  color: green;
`

const ComponentName = ({ data }) => <Box>2 {JSON.stringify(data, null, 4)}</Box>

export const query = graphql`
  {
    site {
      buildTime
    }
  }
`

export default ComponentName
