import type { ColumnDef, RowSelectionState } from '@tanstack/solid-table'
import type { Accessor } from 'solid-js'
import { createSolidTable, flexRender, getCoreRowModel } from '@tanstack/solid-table'
import { createSignal, For, Show, splitProps } from 'solid-js'
import { Checkbox, CheckboxControl } from '../../../../lib/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../lib/components/ui/table'

interface TdataDataTableProps {
  data: Accessor<TdataAccountModel[] | undefined>
  onChange?: (selection: RowSelectionState) => void
}

export interface TdataAccountModel {
  index: number
  dcId: number
  telegramId: number
  disabled: boolean
}

export const columns: ColumnDef<TdataAccountModel>[] = [
  {
    id: 'select',
    header: props => (
      <Checkbox
        class="pl-1"
        indeterminate={props.table.getIsSomePageRowsSelected()}
        checked={(() => {
          return props.table.getCoreRowModel?.().rows.reduce((acc, e) => acc && (e.getIsSelected() || e.original.disabled), true)
        })()}
        onChange={(value) => {
          props.table.toggleAllPageRowsSelected(!!value)
          props.table.setRowSelection((selection) => {
            const next = { ...selection }
            for (const row of props.table.getCoreRowModel().rows) {
              if (row.original.disabled) {
                next[row.original.index] = true
              }
            }

            return next
          })
        }}
        aria-label="Select all"
      >
        <CheckboxControl />
      </Checkbox>
    ),
    cell: props => (
      <Checkbox
        class="pl-1"
        checked={props.row.original.disabled ? true : props.row.getIsSelected()}
        onChange={(value) => {
          props.row.toggleSelected(!!value)
          props.table.setRowSelection((selection) => {
            const next = { ...selection }
            for (const row of props.table.getCoreRowModel().rows) {
              if (row.original.disabled) {
                next[row.original.index] = true
              }
            }

            return next
          })
        }}
        disabled={props.row.original.disabled}
        aria-label="Select row"
      >
        <CheckboxControl />
      </Checkbox>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'index',
    header: 'Index',
  },
  {
    accessorKey: 'dcId',
    header: 'DC Id',
  },
  {
    accessorKey: 'telegramId',
    header: 'Telegram Id',
  },
]

export function TdataDataTable(props: TdataDataTableProps) {
  const [local] = splitProps(props, ['data', 'onChange'])

  const initialSelection: RowSelectionState = {}
  // eslint-disable-next-line solid/reactivity
  for (const [idx, _] of (local.data?.() ?? []).entries()) {
    initialSelection[idx] = true
  }

  const [rowSelection, setRowSelection] = createSignal(initialSelection)

  const table = createSolidTable({
    get data() {
      return local.data() || []
    },
    columns,
    onRowSelectionChange: (s) => {
      const selection = setRowSelection(s)
      local.onChange?.(selection)
    },
    getRowId: (e) => {
      return e.index.toString()
    },
    state: {
      get rowSelection() {
        return rowSelection()
      },
    },
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div class="rounded-md border">
      <Table>
        <TableHeader>
          <For each={table.getHeaderGroups()}>
            {headerGroup => (
              <TableRow>
                <For each={headerGroup.headers}>
                  {(header) => {
                    return (
                      <TableHead>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  }}
                </For>
              </TableRow>
            )}
          </For>
        </TableHeader>
        <TableBody>
          <Show
            when={table.getRowModel().rows?.length}
            fallback={(
              <TableRow>
                <TableCell colSpan={columns.length} class="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          >
            <For each={table.getRowModel().rows}>
              {row => (
                <TableRow data-state={row.getIsSelected() && 'selected'}>
                  <For each={row.getVisibleCells()}>
                    {cell => (
                      <TableCell>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )}
                  </For>
                </TableRow>
              )}
            </For>
          </Show>
        </TableBody>
      </Table>
    </div>
  )
}
