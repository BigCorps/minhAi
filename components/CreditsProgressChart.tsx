              <Tooltip formatter={(value) => hideValues ? '******' : `${value} créditos`} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'stacked':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip hideValues={hideValues} isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="added" name="Adicionados" stackId="a" fill={COLORS.added} />
              <Bar dataKey="consumed" name="Consumidos" stackId="a" fill={COLORS.consumed} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData.slice(-7)}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dateLabel" />
              <PolarRadiusAxis />
              <Tooltip content={<CustomTooltip hideValues={hideValues} isDark={isDark} />} />
              <RechartsRadar 
                name="Adicionados" 
                dataKey="added" 
                stroke={COLORS.added} 
                fill={COLORS.added} 
                fillOpacity={0.6} 
              />
              <RechartsRadar 
                name="Consumidos" 
                dataKey="consumed" 
                stroke={COLORS.consumed} 
                fill={COLORS.consumed} 
                fillOpacity={0.6} 
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        const funnelData = [
          { name: 'Total Adicionado', value: stats.totalAdded, fill: COLORS.added },
          { name: 'Total Consumido', value: stats.totalConsumed, fill: COLORS.consumed },
          { name: 'Saldo Atual', value: stats.currentBalance, fill: COLORS.balance }
        ].filter(item => item.value > 0);
        
        return (
          <ResponsiveContainer width="100%" height={height}>
            <FunnelChart>
              <Tooltip formatter={(value) => hideValues ? '******' : `${value} créditos`} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="added" 
                name="Adicionados" 
                tick={{ fontSize: 12 }} 
              />
              <YAxis 
                type="number" 
                dataKey="consumed" 
                name="Consumidos" 
                tick={{ fontSize: 12 }} 
              />
              <ZAxis dataKey="dateLabel" name="Data" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                content={<CustomTooltip hideValues={hideValues} isDark={isDark} />} 
              />
              <Legend />
              <Scatter 
                name="Relação Créditos" 
                data={chartData} 
                fill={COLORS.balance} 
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip hideValues={hideValues} isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="balance" 
                name="Saldo" 
                stroke={COLORS.balance} 
                strokeWidth={2} 
              />
              <Line 
                type="monotone" 
                dataKey="added" 
                name="Adicionados" 
                stroke={COLORS.added} 
                strokeWidth={2} 
              />
              <Line 
                type="monotone" 
                dataKey="consumed" 
                name="Consumidos" 
                stroke={COLORS.consumed} 
                strokeWidth={2} 
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className={`h-8 w-8 animate-spin ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className={`text-lg ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Progressão de Créditos</CardTitle>
          <CardDescription className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Acompanhe o uso e adição de créditos ao longo do tempo
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHideValues(!hideValues)}
            className={`border ${
              isDark 
                ? 'border-slate-600 hover:bg-slate-700' 
                : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            {hideValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
            <SelectTrigger className={`w-32 border ${
              isDark 
                ? 'border-slate-600 bg-slate-900' 
                : 'border-gray-300 bg-white'
            }`}>
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={`border ${
              isDark 
                ? 'bg-slate-800 border-slate-700' 
                : 'bg-white border-gray-200'
            }`}>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="30days">30 dias</SelectItem>
              <SelectItem value="90days">90 dias</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>

          <ChartTypeSelector selected={chartType} onChange={setChartType} isDark={isDark} />
        </div>

        {chartData.length > 0 ? (
          <div className={cn(
            "flex items-center justify-center",
            chartType === 'pie' ? "h-[300px]" : "h-[250px]"
          )}>
            {renderProgressChart(chartType)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Nenhuma transação encontrada
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}