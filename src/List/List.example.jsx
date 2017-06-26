import React, { Component } from 'react'
import List from './List'
import selectable from './selectable'

const dataTotalCount = 944

const enableSection = false

const dataCenter = new Array(dataTotalCount).fill(null).map((v, i) => ({
  // id: i,
  content: `item ${i}`,
}))

const indexes = ['A', 'B', 'C', 'D', 'Z']

const dataHouse = indexes.map((letter, index) => (
  {
    data: {
      key: index,
      text: letter,
    },
    items: new Array(14).fill('').map((v, i) => ({
      // id: i,
      content: `item ${i}`,
    })),
    itemTotalCount: 24,
  }
))


const renderItem = ({
  item,
  index,
}) => {
  if (item) {
    return (
      <div>
        {item.content}
      </div>
    )
  }
  return (
    null
  )
}

const getItemHeight = (v, i) => {
  // switch (i % 3) {
  //   case 0: {
  //     return 80
  //   }
  //   case 1: {
  //     return 60
  //   }
  //   case 2: {
  //     return 100
  //   }
  //   default:
  //     return 80
  // }
  return 80
}

const selectedStatus = (v, indexInfo) => {
  if (enableSection) {
    return indexInfo.itemIndex % 2 === 0
  }
  return indexInfo % 2 === 0
}

const selectedStatus2 = (v, indexInfo) => {
  if (enableSection) {
    return indexInfo.itemIndex === 2
  }
  return indexInfo === 2
}

const onSelectedChange = (selectedIndexes) => {
  console.log(selectedIndexes)
}

/**
 * Section
 */
const renderSectionHeader = ({
  section,
  index,
}) => {
  // console.log(section)
  return (
    <div
      style={{
        backgroundColor: 'green',
        height: 30,
      }}
    >
      {section.text}
    </div>
  )
}

const SelectableList = selectable(List, {
  enableMultiSelect: true,
})

class ListExample extends Component {
  constructor(props) {
    super(props)
    this.state = {
      data: [],
      defaultSelectedStatus: selectedStatus,
      defaultShownSectionIndex: 0,
      // dataStartIndex: 90,
    }
  }

  render() {
    const {
      defaultSelectedStatus,
      defaultShownSectionIndex,
    } = this.state
    return (
      <SelectableList
        /* normal List*/
        data={enableSection ? dataHouse : dataCenter}
        renderItem={renderItem}
        listHeight={500}
        itemHeight={getItemHeight}
        bufferCount={0}
        itemTotalCount={dataTotalCount}
        onScroll={(...args) => {
          // console.log(...args)
        }}

        /* List with section support */
        enableSection={enableSection}
        sectionHeaderHeight={40}
        renderSectionHeader={renderSectionHeader}
        defaultShownSectionIndex={defaultShownSectionIndex}

        /* List with threshold */
        threshold={8}
        onReachedThreshold={this.onReachedThreshold}

        /* List with selection */
        defaultSelectedStatus={defaultSelectedStatus}
        onSelectedChange={onSelectedChange}
      />
    )
  }
}

export default ListExample
