<context id="1">
  <inputs>
    <input><%= fields[0] %></input>
    <input>column name</input>
    <input><%= dataVariable %></input>
  </inputs>
  <variables/>
  <script>
    <block s="doDeclareVariables">
      <list>
        <l>field names</l>
        <l>row index</l>
        <l>column</l>
        <l>row</l>
      </list>
    </block>
    <block s="doSetVar">
      <l>field names</l>
      <block s="reportNewList">
        <list>
          <%= fields.map(field => `<l>${field}</l>`) %>
        </list>
      </block>
    </block>
    <block s="doSetVar">
      <l>row index</l>
      <l>1</l>
    </block>
    <block s="doRepeat">
      <block s="reportListLength">
        <block var="<%= dataVariable %>"/>
      </block>
      <script>
        <block s="doSetVar">
          <l>row</l>
          <block s="reportListItem">
            <block var="row index"/>
            <block var="<%= dataVariable %>"/>
          </block>
        </block>
        <block s="doIf">
          <block s="reportEquals">
            <block s="reportListItem">
              <l>1</l>
              <block var="row"/>
            </block>
            <block var="<%= fields[0] %>"/>
          </block>
          <script>
            <block s="doSetVar">
              <l>column</l>
              <l>1</l>
            </block>
            <block s="doRepeat">
              <block s="reportListLength">
                <block var="field names"/>
              </block>
              <script>
                <block s="doIf">
                  <block s="reportEquals">
                    <block s="reportListItem">
                      <block var="column"/>
                      <block var="field names"/>
                    </block>
                    <block var="column name"/>
                  </block>
                  <script>
                    <block s="doReport">
                      <block s="reportListItem">
                        <block var="column"/>
                        <block var="row"/>
                      </block>
                    </block>
                  </script>
                </block>
                <block s="doChangeVar">
                  <l>column</l>
                  <l>1</l>
                </block>
              </script>
            </block>
            <block s="doReport">
              <block s="reportJoinWords">
                <list>
                  <l>Column not found: </l>
                  <block var="column name"/>
                </list>
              </block>
            </block>
          </script>
        </block>
        <block s="doChangeVar">
          <l>row index</l>
          <l>1</l>
        </block>
      </script>
    </block>
    <block s="doReport">
      <block s="reportJoinWords">
        <list>
          <l>Could not find "<%= fields[0] %>" with value: </l>
          <block var="<%= fields[0] %>"/>
        </list>
      </block>
    </block>
  </script>
  <receiver>
    <sprite name="Sprite" idx="1" x="0" y="0" heading="90" scale="1" rotation="1" draggable="true" costume="0" color="80,80,80" pen="tip" id="89">
      <costumes>
        <list id="90"/>
      </costumes>
      <sounds>
        <list id="91"/>
      </sounds>
      <variables/>
      <blocks/>
      <scripts/>
    </sprite>
  </receiver>
  <context id="94">
    <inputs/>
    <variables/>
    <receiver>
      <ref id="89"/>
    </receiver>
  </context>
</context>
