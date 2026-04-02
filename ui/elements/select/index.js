'use client'

import { forwardRef } from 'react'

import AsyncSelect from './async-select'
import Combobox from './combobox'
import DefaultSelect from './default-select'
import MultiSelect from './multi-select'
import SearchableSelect from './searchable-select'

const Select = forwardRef(({ variant = 'default', ...props }, ref) => {
  switch (variant) {
    case 'searchable':
      return <SearchableSelect ref={ref} {...props} />
    case 'async':
      return <AsyncSelect ref={ref} {...props} />
    case 'multi':
      return <MultiSelect ref={ref} {...props} />
    case 'combobox':
      return <Combobox ref={ref} {...props} />
    case 'default':
    default:
      return <DefaultSelect ref={ref} {...props} />
  }
})

Select.displayName = 'Select'

export default Select
